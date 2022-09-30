import {SlangType, SlangTypeJson,} from "../../../slang/definitions/type";
import {Input} from ".";
import {Output} from ".";

export interface ConsoleValueType<T> {
	typeDef: SlangTypeJson;
	input?: Input.ValueType<T>;
	output?: Output.ValueType<T>;
}

export class ConsoleValueTypeManager {

	public static register(comp: ConsoleValueType<any>) {
		if (comp.input || comp.output) {
			ConsoleValueTypeManager.components.unshift(comp);
		} else {
			console.error(`ConsoleValueType ${comp} requires a input or output component`);
		}
	}

	public static findInput(type: SlangType): Input.ValueType<any> | undefined {
		const foundInpComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.input && SlangTypeJson.equals(comp.typeDef, type.getTypeDef()));
		if (foundInpComps.length) {
			return foundInpComps[0].input;
		}
		return undefined;
	}

	public static findOutput(type: SlangType): Output.ValueType<any> | undefined {
		const foundOutComps = ConsoleValueTypeManager.components
			.filter((comp: ConsoleValueType<any>) => !!comp.output && SlangTypeJson.equals(comp.typeDef, type.getTypeDef()));
		if (foundOutComps.length) {
			return foundOutComps[0].output;
		}
		return undefined;
	}

	private static components: Array<ConsoleValueType<any>> = [];
}