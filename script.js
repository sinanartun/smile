document.addEventListener('DOMContentLoaded', async () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const context = canvas.getContext('2d');
  const status = document.getElementById('status');

  // Load face-api models
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

  // Start video stream
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error('Error accessing webcam: ', err));

  video.addEventListener('play', () => {
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
      const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
      const resizedDetections = faceapi.resizeResults(detections, displaySize);
      context.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.draw.drawDetections(canvas, resizedDetections);
      faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

      if (resizedDetections.length > 0) {
        const landmarks = resizedDetections[0].landmarks;
        const mouth = landmarks.getMouth();

        const isSmiling = detectSmile(mouth);
        status.textContent = isSmiling ? 'Smiling' : 'Not Smiling';
      } else {
        status.textContent = 'Detecting...';
      }
    }, 100);
  });
});

function detectSmile(mouth) {
  const mouthWidth = distance(mouth[0], mouth[6]);
  const mouthHeight = distance(mouth[3], mouth[9]);
  const smileRatio = mouthWidth / mouthHeight;
  
  // A higher ratio typically indicates a smile
  return smileRatio > 3.0;
}

function distance(point1, point2) {
  return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
}

