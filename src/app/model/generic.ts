import {SlangType} from "../custom/type";

export class GenericSpecifications {
	private genId2Type: Map<string, SlangType>;

	public constructor(private genericIdentifiers: Array<string>) {
		this.genId2Type = new Map<string, SlangType>();
	}

	public specify(genId: string, type: SlangType): SlangType {
		if (this.genericIdentifiers.indexOf(genId) < 0) {
			throw `unknown generic identifier ${genId}`;

		}
		this.genId2Type.set(genId, type);
		return type;
	}

	public get(genId: string): SlangType {
		const genType = this.genId2Type.get(genId);
		if (!genType) {
			throw `generic is not specified: ${genId}`;
		}
		return genType;
	}
}
