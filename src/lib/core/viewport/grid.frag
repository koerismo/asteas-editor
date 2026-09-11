varying vec3 vPosition;
varying float vPixelUnit;
uniform float uGridPower;
uniform vec3 uGridColor;
uniform vec2 uMousePos;

float demap(float x, float a, float b) {
	return (x - a) / (b - a);
}

const float kLineWidth = 2.0;

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
	
	vec2 gridCoord = mod(vPosition.xy + vec2(vPixelUnit * kLineWidth), vec2(gridSize));
	vec2 gridCoord2 = mod(vPosition.xy + vec2(vPixelUnit * kLineWidth), vec2(gridSize2));

	bool onGrid = gridCoord.x <= vPixelUnit * kLineWidth * 2.0 && gridCoord.y <= vPixelUnit * kLineWidth * 2.0;
	bool onGrid2 = gridCoord2.x <= vPixelUnit * kLineWidth * 2.0 && gridCoord2.y <= vPixelUnit * kLineWidth * 2.0;

	gl_FragColor.rgb = uGridColor;
	if (onGrid) {
		gl_FragColor.a = mouseFac;
	} else if (onGrid2) {
		gl_FragColor.a = clamp(gridBlend * gridBlend, 0.0, 1.0) * mouseFac;
	} else {
		discard;
	}
}
