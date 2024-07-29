document.addEventListener('DOMContentLoaded', async () => {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const context = canvas.getContext('2d');
  const status = document.getElementById('status');

  // Load face-landmarks-detection model
  const model = await faceLandmarksDetection.load(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh);

  // Start video stream
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error('Error accessing webcam: ', err));

  video.addEventListener('play', () => {
    const displaySize = { width: video.width, height: video.height };
    canvas.width = displaySize.width;
    canvas.height = displaySize.height;

    setInterval(async () => {
      const predictions = await model.estimateFaces({
        input: video,
        returnTensors: false,
        flipHorizontal: false
      });

      context.clearRect(0, 0, canvas.width, canvas.height);

      if (predictions.length > 0) {
        const keypoints = predictions[0].scaledMesh;
        drawKeypoints(context, keypoints);

        const mouth = getMouthPoints(keypoints);
        const smileStatus = detectSmile(mouth);
        status.textContent = smileStatus;
      } else {
        status.textContent = 'Detecting...';
      }
    }, 100);
  });
});

function getMouthPoints(keypoints) {
  return keypoints.slice(61, 81); // Extract mouth keypoints
}

function detectSmile(mouth) {
  const mouthWidth = distance(mouth[0], mouth[10]);
  const mouthHeight = distance(mouth[3], mouth[13]);
  const smileRatio = mouthWidth / mouthHeight;
  
  if (smileRatio > 1.8) {
    return 'Smiling';
  } else if (smileRatio > 1.2) {
    return 'Normal';
  } else {
    return 'Not Smiling';
  }
}

function distance(point1, point2) {
  return Math.sqrt(Math.pow(point1[0] - point2[0], 2) + Math.pow(point1[1] - point2[1], 2));
}

function drawKeypoints(context, keypoints) {
  context.strokeStyle = 'red';
  for (let i = 0; i < keypoints.length; i++) {
    const [x, y] = keypoints[i];
    context.beginPath();
    context.arc(x, y, 1, 0, 2 * Math.PI);
    context.stroke();
  }
}
