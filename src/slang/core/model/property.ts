import {copySlangTypeValue, SlangType, SlangTypeValue, TypeIdentifier} from "../../definitions/type";
import {GenericSpecifications} from "../custom/generics";

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
}

export class PropertyAssignment {
	private type: SlangType | null = null;

	public constructor(private property: PropertyModel, private value: SlangTypeValue | undefined, generics: GenericSpecifications) {
		const propertyType = property.getType();
		if (propertyType.getTypeIdentifier() === TypeIdentifier.Generic) {
			if (!generics) {
				throw new Error(`need generic specifications when having generic properties`);
			}
			generics.subscribeGenericTypeChanged(propertyType.getGenericIdentifier(), (type) => {
				this.type = type;
			});
		} else {
			this.type = property.getType();
		}
	}

	public getProperty(): PropertyModel {
		return this.property;
	}

	public getName(): string {
		return this.property.getName();
	}

	public getType(): SlangType | null {
		return this.type;
	}

	public getValue(): SlangTypeValue | undefined {
		return this.value;
	}

	public isStream(): boolean {
		return this.property.getTypeIdentifier() === TypeIdentifier.Stream;
	}

	public isEqual(other: PropertyAssignment): boolean {
		return this.property === other.property && this.value === other.value;
	}

	public assign(value: SlangTypeValue | undefined) {
		this.value = value;
	}
}

export class PropertyAssignments {
	private readonly assignments: Map<string, PropertyAssignment>;

	public constructor(private properties: PropertyModel[], generics: GenericSpecifications) {
		this.assignments = new Map<string, PropertyAssignment>(
			properties.map<[string, PropertyAssignment]>(
				(property) => [property.getName(), new PropertyAssignment(property, undefined, generics)],
			),
		);
	}

	public copy(generics: GenericSpecifications): PropertyAssignments {
		const propAssigns = new PropertyAssignments(this.properties, generics);
		for (const propAssign of this.getAssignments()) {
			let value = propAssign.getValue();
			if (value) {
				value = copySlangTypeValue(value);
			}
			propAssigns.get(propAssign.getName()).assign(value);
		}
		return propAssigns;
	}

	public isEqual(other: PropertyAssignments): boolean {
		if (this.assignments.size !== other.assignments.size) {
			return false;
		}

		for (const propAssign of this.getAssignments()) {
			const prop = propAssign.getProperty();
			if (!(other.isDefined(prop) && propAssign.isEqual(other.get(prop)))) {
				return false;
			}
		}
		return true;
	}

	public getProperties(): IterableIterator<PropertyModel> {
		return this.properties.values();
	}

	public getAssignments(): IterableIterator<PropertyAssignment> {
		return this.assignments.values();
	}

	public get(property: PropertyModel | string): PropertyAssignment {
		return this.getByName((property instanceof PropertyModel) ? property.getName() : property);
	}

	public isDefined(propertyName: string | PropertyModel): boolean {
		const propAssign = this.assignments.get((propertyName instanceof PropertyModel) ? propertyName.getName() : propertyName);
		return !!propAssign && !!propAssign.getValue();
	}

	private getByName(propertyName: string): PropertyAssignment {
		const propVal = this.assignments.get(propertyName);
		if (!propVal) {
			throw new Error(`property ${propertyName} not assigned: ${propertyName}`);
		}
		return propVal;
	}
}
