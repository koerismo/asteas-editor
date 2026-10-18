varying vec2 vUv;

uniform sampler2D uMap;

void main() {
	gl_FragColor = texture(uMap, vUv);
}
