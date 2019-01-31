import {copySlangTypeValue, SlangType, SlangTypeValue, TypeIdentifier} from "./definitions/type";
import {GenericSpecifications} from "./models/port";

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

	public constructor(private property: PropertyModel, private value: SlangTypeValue | undefined, generics: GenericSpecifications | null) {
		const propertyType = property.getType();
		if (propertyType.getTypeIdentifier() === TypeIdentifier.Generic) {
			if (generics) {
				generics.subscribeGenericTypeChanged(propertyType.getGenericIdentifier(), (type) => {
					this.type = type;
				});
			}
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

	public constructor(private properties: PropertyModel[], generics: GenericSpecifications | null) {
		this.assignments = new Map<string, PropertyAssignment>(
			properties.map<[string, PropertyAssignment]>(
				(property) => [property.getName(), new PropertyAssignment(property, undefined, generics)],
			),
		);
	}

	public copy(generics: GenericSpecifications | null): PropertyAssignments {
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

export class PropertyEvaluator {
	public static expand(str: string, propAssigns?: PropertyAssignments): string[] {
		let exprs = [str];

		if (propAssigns) {
			for (const expr of exprs) {
				const parts = /{(.*?)}/.exec(expr);
				if (!parts) {
					break;
				}

				// This could be extended with more complex logic in the future
				const vals = this.expandExpression(parts[1], propAssigns);

				// Actual replacement
				const newExprs = [];
				for (const val of vals) {
					for (const e of exprs) {
						newExprs.push(e.replace(parts[0], val));
					}
				}
				exprs = newExprs;
			}
		}

		return exprs;
	}

	public static expandType(type: SlangType, propAssigns: PropertyAssignments): SlangType {
		switch (type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of type.getMapSubs()) {
					for (const expSubName of PropertyEvaluator.expand(subName, propAssigns)) {
						type.addMapSub(expSubName, PropertyEvaluator.expandType(subType, propAssigns));
					}
				}
				break;
			case TypeIdentifier.Stream:
				type.setStreamSub(PropertyEvaluator.expandType(type.getStreamSub(), propAssigns));
				break;
			case TypeIdentifier.Generic:
				type.setGenericIdentifier(type.getGenericIdentifier());
				break;
		}

		return type;
	}

	private static expandExpression(exprPart: string, propAssigns: PropertyAssignments): string[] {
		const vals: string[] = [];

		if (!propAssigns.isDefined(exprPart)) {
			return [];
		}

		const propAssign = propAssigns.get(exprPart);
		const propValue: any = propAssign.getValue();

		if (propAssign.isStream()) {
			if (typeof propValue === "string" && (propValue as string).startsWith("$")) {
				vals.push(`{${propValue.substr(1)}}`);
			} else {
				for (const el of propValue) {
					vals.push((typeof el === "string") ? el : JSON.stringify(el));
				}
			}
		} else {
			vals.push((typeof propValue === "string") ? propValue : JSON.stringify(propValue));
		}
		return vals;
	}
}
