/* This file will contain the PlaybulbSphere Class that will be used to
 * interact with the PLAYBULB Sphere Bluetooth device. */
(function(){
    'use strict';

    let encoder = new TextEncoder('utf-8');
    let decoder = new TextDecoder('utf-8');

    const SPHERE_SERVICE_UUID     = '0000ff08-0000-1000-8000-00805f9b34fb';
    const SPHERE_COLOR_UUID       = 0xFFFC;
    const SPHERE_DEVICE_NAME_UUID = 0xFFFF;
    const SPHERE_EFFECT_UUID      = 0xFFFB;

    class PlaybulbSphere {
        constructor() {
            this.device = null;
            this.server = null;
            this._characteristics = new Map();
        }
        connect() {
        let options = {filters:[{services:[ SPHERE_SERVICE_UUID ]}]}
        return navigator.bluetooth.requestDevice(options)
        .then(device => {
            this.device = device;
            return device.connectGATT();
        })
        .then(server => {
            this.server = server;
            return Promise.all([
                server.getPrimaryService(SPHERE_SERVICE_UUID).then(service => {
                    return Promise.all([
                        this._cacheCharacteristic(service, SPHERE_DEVICE_NAME_UUID),
                        this._cacheCharacteristic(service, SPHERE_COLOR_UUID),
                        this._cacheCharacteristic(service, SPHERE_EFFECT_UUID),
                    ]);
                })
            ]);
        });
        }
        getDeviceName() {
            return this._readCharacteristicValue(SPHERE_DEVICE_NAME_UUID)
            .then(this._decodeString);
        }
        setDeviceName(name) {
            let data = this._encodeString(name);
            return this._writeCharacteristicValue(SPHERE_DEVICE_NAME_UUID, data);
        }

        
        setColor(r, g, b) {
            let data = [0x00, r, g, b];
            return this._writeCharacteristicValue(SPHERE_COLOR_UUID, new Uint8Array(data))
            .then(() => [r,g,b]); // Returns color when fulfilled.
        }


        setSphereEffectColor(r, g, b) {
            let data = [0x00, r, g, b, 0x04, 0x00, 0x01, 0x00];
            return this._writeCharacteristicValue(SPHERE_EFFECT_UUID, new Uint8Array(data))
            .then(() => [r,g,b]); // Returns color when fulfilled.
        }
        setFlashingColor(r, g, b) {
            let data = [0x00, r, g, b, 0x00, 0x00, 0x1F, 0x00];
            return this._writeCharacteristicValue(SPHERE_EFFECT_UUID, new Uint8Array(data))
            .then(() => [r,g,b]); // Returns color when fulfilled.
        }
        setPulseColor(r, g, b) {
            // We have to correct user color to make it look nice for real...
            let newRed = Math.min(Math.round(r / 64) * 64, 255);
            let newGreen = Math.min(Math.round(g / 64) * 64, 255);
            let newBlue = Math.min(Math.round(b / 64) * 64, 255);
            let data = [0x00, newRed, newGreen, newBlue, 0x01, 0x00, 0x09, 0x00];
            return this._writeCharacteristicValue(SPHERE_EFFECT_UUID, new Uint8Array(data))
            .then(() => [r,g,b]); // Returns color when fulfilled.
        }
        setRainbow() {
            let data = [0x01, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0x00];
            return this._writeCharacteristicValue(SPHERE_EFFECT_UUID, new Uint8Array(data));
        }
        setRainbowFade() {
            let data = [0x01, 0x00, 0x00, 0x00, 0x03, 0x00, 0x26, 0x00];
            return this._writeCharacteristicValue(SPHERE_EFFECT_UUID, new Uint8Array(data));
        }

        /* Utils */

        _cacheCharacteristic(service, characteristicUuid) {
            return service.getCharacteristic(characteristicUuid)
            .then(characteristic => {
                this._characteristics.set(characteristicUuid, characteristic);
            });
        }
        _readCharacteristicValue(characteristicUuid) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.readValue()
            .then(data => {
                // In Chrome 50+, a DataView is returned instead of an ArrayBuffer.
                data = data.buffer ? data : new DataView(data);
                return data;
            });
        }
        _writeCharacteristicValue(characteristicUuid, value) {
            let characteristic = this._characteristics.get(characteristicUuid);
            return characteristic.writeValue(value);
        }
        _decodeString(data) {
            return decoder.decode(data);
        }
        _encodeString(data) {
            return encoder.encode(data);
        }
    };

    window.playbulbSphere = new PlaybulbSphere();
})();

