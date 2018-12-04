import {SlangType} from "../custom/type";

export class GenericSpecifications {
	private genId2Type: Map<string, SlangType>;

	public constructor(private genericIdentifiers: Array<string>) {
		this.genId2Type = new Map<string, SlangType>();
	}

	public specify(genId: string, type: SlangType): SlangType {
		if (this.genericIdentifiers.indexOf(genId) < 0) {
			throw new Error(`unknown generic identifier ${genId}`);

		}
		this.genId2Type.set(genId, type);
		return type;
	}

	public get(identifier: string): SlangType {
		const genType = this.genId2Type.get(identifier);
		if (!genType) {
			throw new Error(`generic is not specified: ${identifier}`);
		}
		return genType;
	}

	public has(identifier: string): boolean {
		return this.genId2Type.has(identifier);
	}
}
