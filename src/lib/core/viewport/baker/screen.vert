varying vec2 vUv;

void main() {
	#if FLIP_V
		vUv = vec2(uv.x, 1.0 - uv.y);
	#else
		vUv = uv;
	#endif
	gl_Position = vec4(position, 1.0);
}
