document.querySelector('#connect').addEventListener('click', event => {
    document.querySelector('#state').classList.add('connecting');

    playbulbSphere.connect()
    .then(() => {
        console.log(playbulbSphere.device);
        document.querySelector('#state').classList.remove('connecting');
        document.querySelector('#state').classList.add('connected');
        return playbulbSphere.getDeviceName().then(handleDeviceName)
    })
    .catch(error => {
        alert('Shit! ' + error);
    });
});

function handleDeviceName(deviceName) { document.querySelector('#deviceName').value = deviceName; }


let mic_on = false;

let current_effect = 'noEffect';
function changeColor() {
    var effect = document.querySelector('[name="effectSwitch"]:checked').id;
    current_effect = effect;
    switch(effect) {
        case 'noEffect':
            playbulbSphere.setColor(r, g, b).then(onColorChanged);
            break;
        case 'candleEffect':
            playbulbSphere.setSphereEffectColor(r, g, b).then(onColorChanged);
            break;
        case 'flashing':
            playbulbSphere.setFlashingColor(r, g, b).then(onColorChanged);
            break;
        case 'pulse':
            playbulbSphere.setPulseColor(r, g, b).then(onColorChanged);
            break;
        case 'rainbow':
            playbulbSphere.setRainbow().then(onColorChanged);
            break;
        case 'rainbowFade':
            playbulbSphere.setRainbowFade().then(onColorChanged);
            break;
        case 'microphone_volume':
        case 'microphone_color':
            if (audio_not_initialized) startAudio();

            if (mic_on) break; // Don't keep setTimeouting!

            mic_on = true;

            function setMic () {
                const MAX_INDEX = 60;

                let red   = 0;
                let green = 0;
                let blue  = 0;

                if (current_effect == 'microphone_color') {
                    let partial_sums = Array.apply(null, Array(3)).map(Number.prototype.valueOf,0);
                    for (let i = 0; i < MAX_INDEX && i < microphone_data.length; i += 1) {
                        let n = 0;

                        if (i < MAX_INDEX / 3) 
                            n = 0;
                        if (i >= MAX_INDEX / 3 && i < MAX_INDEX * 2 / 3 ) 
                            n = 1;
                        if (i >= MAX_INDEX * 2 / 3 ) 
                            n = 2;

                        partial_sums[n] += microphone_data[i];
                    }
                    
                    partial_sums.forEach(function(e,i){
                        partial_sums[i] /= 10;
                    });

                    red   = partial_sums[0]/255*100;
                    green = partial_sums[1]/255*100;
                    blue  = partial_sums[2]/255*100;
                }

                if (current_effect === 'microphone_volume') {
                    let avg = 0;
                    for (let i = 0; i < MAX_INDEX && i < microphone_data.length; i += 1) {
                        avg += microphone_data[i];
                    }
                    avg /= Math.min(MAX_INDEX, microphone_data.length);
                    avg = Math.floor(avg);

                    prev_sound_lvls.pop();
                    prev_sound_lvls.unshift(avg);

                    let running_avg = prev_sound_lvls.reduce(function(p,c){ return p + c; }) / prev_sound_lvls.length;
                    let percent = running_avg / 255;

                    red   = r * percent;
                    green = g * percent;
                    blue  = b * percent;
                }

                playbulbSphere.setColor(red,green,blue)
                .then(() => {
                    if (mic_on) setTimeout(setMic,10);
                });
            }

            setMic();
            
            break;
    }

    if (effect !== 'microphone_volume' && effect !== 'microphone_color') mic_on = false;
}

let prev_sound_lvls = Array.apply(null, Array(5)).map(Number.prototype.valueOf,0);








document.querySelector('#deviceName').addEventListener('input', event => {
    playbulbSphere.setDeviceName(event.target.value)
    .then(() => {
        console.log('Device name changed to ' + event.target.value);
    })
    .catch(error => {
        console.error('Argh!', error);
    });
});

var r = g = b = 255;

function onColorChanged(rgb) {
    if (rgb) {
        r = rgb[0]; 
        g = rgb[1]; 
        b = rgb[2];
    }
}

var img = new Image();
img.src = 'color-wheel.png';
img.onload = function() {
    var canvas = document.getElementById('colorwheel');
    var context = canvas.getContext('2d');

    canvas.width = 300 * devicePixelRatio;
    canvas.height = 300 * devicePixelRatio;
    canvas.style.width = "300px";
    canvas.style.height = "300px";

    let dragging = false;
    function colorselect(evt) {
        // Refresh canvas in case user zooms and devicePixelRatio changes.
        canvas.width = 300 * devicePixelRatio;
        canvas.height = 300 * devicePixelRatio;
        context.drawImage(img, 0, 0, canvas.width, canvas.height);

        var rect = canvas.getBoundingClientRect();
        var x = Math.round((evt.clientX - rect.left) * devicePixelRatio);
        var y = Math.round((evt.clientY - rect.top) * devicePixelRatio);
        var data = context.getImageData(0, 0, canvas.width, canvas.height).data;

        r = data[((canvas.width * y) + x) * 4];
        g = data[((canvas.width * y) + x) * 4 + 1];
        b = data[((canvas.width * y) + x) * 4 + 2];

        changeColor();

        context.beginPath();
        context.arc(x, y + 2, 10 * devicePixelRatio, 0, 2 * Math.PI, false);
        context.shadowColor = '#333';
        context.shadowBlur = 4 * devicePixelRatio;
        context.fillStyle = 'white';
        context.fill();
    };

    canvas.addEventListener('mousedown', evt => { dragging = true; colorselect(evt); });
    canvas.addEventListener('mouseup'  , evt => { dragging = false;                  });
    canvas.addEventListener('mousemove', evt => { if (dragging) colorselect(evt);    });


    context.drawImage(img, 0, 0, canvas.width, canvas.height);
}

document.querySelector('#noEffect')         .addEventListener('click', changeColor);
document.querySelector('#candleEffect')     .addEventListener('click', changeColor);
document.querySelector('#flashing')         .addEventListener('click', changeColor);
document.querySelector('#pulse')            .addEventListener('click', changeColor);
document.querySelector('#rainbow')          .addEventListener('click', changeColor);
document.querySelector('#rainbowFade')      .addEventListener('click', changeColor);
document.querySelector('#microphone_volume').addEventListener('click', changeColor);
document.querySelector('#microphone_color') .addEventListener('click', changeColor);

let audio_not_initialized = true;

let microphone_data = [];

var microphone_stream = null,
        gain_node = null,
        script_processor_node = null,
        script_processor_fft_node = null,
        analyserNode = null;

function startAudio () {
    audio_not_initialized = false;

    var audioContext = new AudioContext();

    console.log("audio is starting up ...");

    var BUFF_SIZE = 16384;

    

    if (!navigator.getUserMedia)
        navigator.getUserMedia = navigator.getUserMedia 
                              || navigator.webkitGetUserMedia 
                              || navigator.mozGetUserMedia 
                              || navigator.msGetUserMedia;

    if (navigator.getUserMedia){
        navigator.getUserMedia(
            {audio:true}, 
            function(stream) {
                start_microphone(stream);
            },
            function(e) {
                alert('Error capturing audio.');
            }
        );
    } else { alert('getUserMedia not supported in this browser.'); }

    function start_microphone(stream){
        gain_node = audioContext.createGain();
        gain_node.gain.value = 10;
        gain_node.connect( audioContext.destination );

        microphone_stream = audioContext.createMediaStreamSource(stream);

        script_processor_node = audioContext.createScriptProcessor(BUFF_SIZE, 1, 1);

        microphone_stream.connect(script_processor_node);

        // --- setup FFT

        script_processor_fft_node = audioContext.createScriptProcessor(2048, 1, 1);
        script_processor_fft_node.connect(gain_node);

        analyserNode = audioContext.createAnalyser();
        analyserNode.smoothingTimeConstant = 0;
        analyserNode.fftSize = 1024;

        microphone_stream.connect(analyserNode);

        analyserNode.connect(script_processor_fft_node);

        script_processor_fft_node.onaudioprocess = function() {
            // get the average for the first channel
            var array = new Uint8Array(analyserNode.frequencyBinCount);
            analyserNode.getByteFrequencyData(array);

            // draw the spectrogram
            if (microphone_stream.playbackState == microphone_stream.PLAYING_STATE) {
                microphone_data = array;

                let canvas = document.getElementById('fft_visualizer');
                canvas.width  = 300 * devicePixelRatio;
                canvas.height = 200 * devicePixelRatio;
                let ctx = canvas.getContext('2d');

                let i = 0;
                array.forEach(vol => {
                    if (i > 60) return;

                    if (i % 10 == 0) ctx.fillStyle = 'green';
                    else             ctx.fillStyle = 'red';

                    i++;
                    ctx.fillRect(
                        4*i                 *devicePixelRatio, 
                        (canvas.height - 20) *devicePixelRatio, 
                        1                    *devicePixelRatio, 
                        -1*vol               *devicePixelRatio
                    );
                })
            }
        };
    }
};