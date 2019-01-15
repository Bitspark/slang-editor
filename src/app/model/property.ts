import {TypeIdentifier, SlangType, SlangTypeValue} from "../custom/type";

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

	public define(value: SlangTypeValue): PropertyAssignment {
		return new PropertyAssignment(this, value);
	}
}

export class PropertyAssignment {
	public constructor(private property: PropertyModel, private value: any) {
	}

	public getProperty(): PropertyModel {
		return this.property;
	}

	public getPropertyName(): string {
		return this.property.getName();
	}

	public getValue(): any {
		return this.value;
	}

	public isStream(): boolean {
		return this.property.getTypeIdentifier() === TypeIdentifier.Stream;
	}

	public isEqual(other: PropertyAssignment): boolean {
		return this.property === other.property && this.value == other.value;
	}
}

export class PropertyAssignments {
	private readonly name2Prop: Map<string, PropertyModel>;
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

		for (const propAssign of this.getIterator()) {
			propAssigns.assign(propAssign.getProperty(), propAssign.getValue());
		}

		return propAssigns;
	}

	public isEqual(other: PropertyAssignments): boolean {
		if (this.name2propAssign.size !== other.name2propAssign.size) {
			return false
		}

		for (const propAssign of this.getIterator()) {
			const prop = propAssign.getProperty();
			if (!(other.has(prop) && propAssign.isEqual(other.get(prop)))) {
				return false;
			}
		}
		return true
	}

	public getIterator(): IterableIterator<PropertyAssignment> {
		return this.name2propAssign.values();
	}

	public assign(propertyName: string | PropertyModel, propertyValue: any): PropertyAssignment {
		if (propertyName instanceof PropertyModel) {
			propertyName = propertyName.getName();
		}
		const property = this.name2Prop.get(propertyName);
		if (!property) {
			throw `unknown property: ${propertyName}`;
		}
		const def = property.define(propertyValue);
		this.name2propAssign.set(property.getName(), def);
		return def;
	}

	public get(property: PropertyModel): PropertyAssignment {
		return this.getByName(property.getName());
	}

	public has(propertyName: string | PropertyModel): boolean {
		if (propertyName instanceof PropertyModel) {
			propertyName = propertyName.getName();
		}
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
