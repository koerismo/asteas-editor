varying vec2 vUv;
varying vec2 vSize;

varying float vBevel;
varying float vRadius;

uniform float uBevel;
uniform float uRadius;

void main() {
	vec4 mvPosition = vec4( position, 1.0 );
    #ifdef USE_INSTANCING
    mvPosition = instanceMatrix * mvPosition;
    #endif

	vUv = uv;
	vSize = vec2(instanceMatrix[0].x, instanceMatrix[1].y);

	vBevel = uBevel;
	vRadius = min(uRadius, min(vSize.x, vSize.y) * 0.5);;

	vec4 modelViewPosition = modelViewMatrix * mvPosition;
    gl_Position = projectionMatrix * modelViewPosition;
}
