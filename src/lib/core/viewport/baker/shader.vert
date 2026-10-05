varying vec2 vPos;
varying vec2 vPosMin;
varying vec2 vPosMax;

void main() {
	vPos = position.xy;
	vPosMin = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xy;
	vPosMax = (modelMatrix * vec4(1.0, 1.0, 0.0, 1.0)).xy;
	gl_Position = modelViewMatrix * projectionMatrix * position;
}
