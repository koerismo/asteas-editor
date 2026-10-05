varying float vBevel;
varying float vRadius;

varying vec2 vUv;
varying vec2 vSize;

uniform float uExpo;

float roundedSquareSdf(in vec2 pos, in vec2 size, in float radius) {
    vec2 q = abs(pos) - size + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

vec2 roundedSquareNormal(in vec2 pos, in vec2 size, in float radius) {
	vec2 center_rect = size - vec2(radius);
	vec2 apos = abs(pos);

	// Outer
	if (apos.x > center_rect.x || apos.y > center_rect.y) {
		vec2 clamped_pos = clamp(pos, -center_rect, center_rect);
		return normalize(pos - clamped_pos);
	}

	// Inner
	vec2 inner = apos - size;
	vec2 corner = (inner.x > inner.y ? vec2(1.0, 0.0) : vec2(0.0, 1.0)) * sign(pos);
	return corner;
}

void main() {
	vec2 halfSize = vSize * 0.5;
	vec2 deltaPos = vUv * vSize - halfSize;

	float depth = clamp(
		-roundedSquareSdf(deltaPos, halfSize, vRadius),
		0.0,
		vBevel
	);

	float depthFac = depth / vBevel;
	float depthColor = pow(depthFac, uExpo);

	#if BAKE_MODE != MODE_HEIGHT
		vec3 rgb = vec3(0.5, 0.5, 1.0);
		if (depth < vBevel && depth > 0.0) {
			vec2 offset = roundedSquareNormal(deltaPos, halfSize, vRadius);
			float expoDeriv = uExpo * pow(depthFac, uExpo - 1.0);
			vec3 normal = normalize(vec3(offset * expoDeriv, 1.0));
			rgb = normal * 0.5 + vec3(0.5);
		}
	#else
		vec3 rgb = vec3(depthColor);
	#endif

	#if BAKE_MODE == MODE_COMBINED
		gl_FragColor = vec4(rgb, depthColor);
	#else
		gl_FragColor = vec4(rgb, 1.0);
	#endif

}
