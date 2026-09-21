varying vec3 vPosition;

varying float vPixelUnit;
uniform float uGridPower;
uniform vec2 uMousePos;

uniform float opacity;

float demap(float x, float a, float b) {
	return (x - a) / (b - a);
}

const float kLineWidth = 1.0;
const vec4 kColorBlack = vec4(0.0, 0.0, 0.0, 0.5);
const vec4 kColorWhite = vec4(1.0, 1.0, 1.0, 1.0);

int get_pixel_type(in vec2 p) {
	float pointSize = vPixelUnit * kLineWidth * 2.0;
	if (p.x <= pointSize && p.y <= pointSize) return 1;
	if (p.x <= pointSize || p.y <= pointSize) return 0;
	if (p.x <= pointSize * 2.0 && p.y <= pointSize * 2.0) return 2;
	return 0;
}

void main() {
	float mouseDist = length(vec2(uMousePos - vPosition.xy)) / vPixelUnit;
	float mouseFac = demap(clamp(mouseDist, 100.0, 800.0), 800.0, 100.0);

	if (mouseFac <= 0.0) {
		discard;
	}

	float gridPower = floor(uGridPower);
	float gridBlend = 1.0 - fract(uGridPower);

	float gridSize = pow(2.0, gridPower);
	float gridSize2 = pow(2.0, gridPower - 1.0);

	float pointSize = vPixelUnit * kLineWidth * 2.0;
	vec2 gridCoord = mod(vPosition.xy + vec2(pointSize, -pointSize), vec2(gridSize));
	vec2 gridCoord2 = mod(vPosition.xy + vec2(pointSize, -pointSize), vec2(gridSize2));
	
	int pixelType = get_pixel_type(gridCoord);
	int pixelType2 = get_pixel_type(gridCoord2);

	if (pixelType != 0) {
		gl_FragColor = pixelType == 2
			? kColorBlack : kColorWhite;
		gl_FragColor.a *= mouseFac * opacity;
	} else if (pixelType2 != 0) {
		gl_FragColor = pixelType2 == 2
			? kColorBlack : kColorWhite;
		gl_FragColor.a *= gridBlend * mouseFac * opacity;
	} else {
		discard;
	}
}
