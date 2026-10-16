import {
	ShaderMaterial,
	type IUniform,
	type ShaderMaterialParameters,
} from 'three';

export type AnyParams = Record<string, unknown>;
export type AnyUniforms = Record<string, IUniform<unknown>>;
export type ParamsToUniforms<T extends AnyParams> = {
	[key in keyof T]: IUniform<T[key]>;
};

export type TypedShaderMaterial<T extends AnyUniforms> = ShaderMaterial & {
	uniforms: T;
};
export type TypedShaderParams<T extends AnyUniforms> =
	ShaderMaterialParameters & { uniforms: T };

export function makeShaderMaterial<T extends AnyUniforms>(
	params: TypedShaderParams<T>,
) {
	return new ShaderMaterial(params) as TypedShaderMaterial<T>;
}
