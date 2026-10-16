varying vec2 vUv;

uniform sampler2D uMap;

void main() {
	#if FLIP_GREEN
		vec4 rgba = texture(uMap, vUv);
		gl_FragColor = vec4(rgba.r, 1.0 - rgba.g, rgba.ba);
	#else
		gl_FragColor = texture(uMap, vUv);
	#endif
}
