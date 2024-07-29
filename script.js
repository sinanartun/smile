document.addEventListener('DOMContentLoaded', init);

async function init() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('overlay');
  const context = canvas.getContext('2d');
  const status = document.getElementById('status');

  await loadModels();
  startVideoStream(video);

  video.addEventListener('play', () => {
    const displaySize = { width: video.width, height: video.height };
    faceapi.matchDimensions(canvas, displaySize);
    detectFaces(video, canvas, context, displaySize, status);
  });
}

async function loadModels() {
  await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
  await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
  await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
}

function startVideoStream(video) {
  navigator.mediaDevices.getUserMedia({ video: {} })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => console.error('Error accessing webcam:', err));
}

function detectFaces(video, canvas, context, displaySize, status) {
  setInterval(async () => {
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    context.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

    if (resizedDetections.length > 0) {
      const landmarks = resizedDetections[0].landmarks;
      const mouth = landmarks.getMouth();
      const nose = landmarks.getNose();
      const isSmiling = detectSmile(mouth, nose);
      status.textContent = isSmiling ? 'Smiling' : 'Not Smiling';
      // status.textContent = isSmiling
    } else {
      status.textContent = 'Detecting...';
    }
  }, 333);
}

function detectSmile(mouth, nose) {
  // Select corners based on their x positions
  const leftCorner = mouth.reduce((prev, curr) => (curr._x < prev._x ? curr : prev));
  const rightCorner = mouth.reduce((prev, curr) => (curr._x > prev._x ? curr : prev));

  // Select top and bottom center points based on their y positions
  const topCenter = mouth.reduce((prev, curr) => (curr._y < prev._y ? curr : prev));
  const bottomCenter = mouth.reduce((prev, curr) => (curr._y > prev._y ? curr : prev));

  // Get the lowest point of the nose
  const noseLowest = nose.reduce((prev, curr) => (curr._y > prev._y ? curr : prev));

  // Calculate horizontal distance between mouth corners
  const mouthWidth = distance(leftCorner, rightCorner);

  // Calculate vertical distances from corners to top and bottom center
  const leftTopDistance = distance(leftCorner, topCenter);
  const rightTopDistance = distance(rightCorner, topCenter);
  const leftBottomDistance = distance(leftCorner, bottomCenter);
  const rightBottomDistance = distance(rightCorner, bottomCenter);

  // Calculate average distances to determine mouth shape
  const avgTopDistance = (leftTopDistance + rightTopDistance) / 2;
  const avgBottomDistance = (leftBottomDistance + rightBottomDistance) / 2;

  // Calculate distance between the lowest point of the nose and the highest point of the mouth
  const noseToMouthDistance = distance(noseLowest, topCenter);

  // Determine smile based on the ratio of mouth width to average distances and nose to mouth distance
  const smileRatio = mouthWidth / avgBottomDistance;
  console.log(noseToMouthDistance);
  return noseToMouthDistance > 52
  // A higher smile ratio and a shorter nose to mouth distance typically indicates a smile
  return smileRatio > 1.5 && noseToMouthDistance < 50; // Adjust threshold as needed
}

function distance(point1, point2) {
  return Math.sqrt(Math.pow(point1._x - point2._x, 2) + Math.pow(point1._y - point2._y, 2));
}
