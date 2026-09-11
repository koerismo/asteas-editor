varying vec3 vPosition;
varying float vPixelUnit;

uniform vec2 uPixelSize;
uniform mat4 uInvProjectionMatrix;

void main() {

	mat4 invViewMatrix = mat4(
		vec4(
			1.0 / modelViewMatrix[0].x,
			modelViewMatrix[0].yzw
		),
		vec4(
			modelViewMatrix[1].x,
			1.0 / modelViewMatrix[1].y,
			modelViewMatrix[1].zw
		),
		modelViewMatrix[2].xyzw,
		-modelViewMatrix[3].xyzw
	);
	
	vPixelUnit = uInvProjectionMatrix[1].y / uPixelSize.y;
	vPosition = (invViewMatrix * uInvProjectionMatrix * vec4(position, 1.0)).xyz;
	// vPosition = (projectionMatrix * vec4(position, 1.0)).xyz;
	gl_Position = vec4(position, 1.0);
}
