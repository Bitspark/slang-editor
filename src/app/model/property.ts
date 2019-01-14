import {TypeIdentifier, SlangType} from "../custom/type";

export class PropertyModel {
	public constructor(private name: string, private type: SlangType) {
	}

	public getName(): string {
		return this.name;
	}

	public getType(): SlangType {
		return this.type;
	}

	public getTypeIdentifier(): TypeIdentifier {
		return this.type.getTypeIdentifier();
	}

	public define(value: any): PropertyAssignment {
		return new PropertyAssignment(this, value);
	}
}

export class PropertyAssignment {
	public constructor(private property: PropertyModel, private value: any) {
	}

	public getValue(): any {
		return this.value;
	}

	public isStream(): boolean {
		return this.property.getTypeIdentifier() === TypeIdentifier.Stream;
	}
}

export class PropertyAssignments {
	private name2Prop: Map<string, PropertyModel>;
	private name2propAssign: Map<string, PropertyAssignment>;

	public constructor(properties: Array<PropertyModel>) {
		this.name2Prop = new Map<string, PropertyModel>(
			properties.map<[string, PropertyModel]>((property: PropertyModel) => [property.getName(), property])
		);
		this.name2propAssign = new Map<string, PropertyAssignment>();
	}

	public copy(): PropertyAssignments {
		const propNamesIter = this.name2Prop.values();
		const propAssigns = new PropertyAssignments(Array.from(propNamesIter));

		for (const [propName, propAssign] of this.getIterator()) {
			propAssigns.assign(propName, propAssign.getValue());
		}

		return propAssigns;

	}

	public getIterator(): IterableIterator<[string, PropertyAssignment]> {
		return this.name2propAssign.entries();
	}

	public assign(propertyName: string, propertyValue: any): PropertyAssignment {
		const property = this.name2Prop.get(propertyName);
		if (!property) {
			throw `unknown property: ${propertyName}`;
		}
		const def = property.define(propertyValue);
		this.name2propAssign.set(property.getName(), def);
		return def;
	}

	public has(propertyName: string): boolean {
		return this.name2propAssign.has(propertyName);
	}

	public getByName(propertyName: string): PropertyAssignment {
		const propVal = this.name2propAssign.get(propertyName);
		if (!propVal) {
			throw `property not assigned: ${propertyName}`;
		}
		return propVal;
	}
}
