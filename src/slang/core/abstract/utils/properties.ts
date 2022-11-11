import {BehaviorSubject, Subject, Subscription} from "rxjs";

import {SlangType, SlangTypeValue, TypeIdentifier} from "../../../definitions/type";

import {GenericSpecifications} from "./generics";

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
	private readonly value = new BehaviorSubject<SlangTypeValue | undefined>(undefined);

	public constructor(private property: PropertyModel, value: SlangTypeValue | undefined, generics: GenericSpecifications) {
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

		this.assign(value);
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
		return this.value.getValue();
	}

	public isStream(): boolean {
		return this.property.getTypeIdentifier() === TypeIdentifier.Stream;
	}

	public assign(value: SlangTypeValue | undefined) {
		// TODO: Check if type is correct
		this.value.next(value);
	}

	public subscribeAssignmentChanged(cb: (newValue: SlangTypeValue | undefined) => void): Subscription {
		return this.value.subscribe(cb);
	}
}

export class PropertyAssignments {
	private readonly assignments: Map<string, PropertyAssignment>;
	private readonly assignmentChanged = new Subject<{ property: PropertyModel, newValue: SlangTypeValue | undefined }>();

	public constructor(private properties: Iterable<PropertyModel>, generics: GenericSpecifications) {
		this.assignments = new Map<string, PropertyAssignment>(
			Array.from(properties).map<[string, PropertyAssignment]>(
				(property) => [property.getName(), new PropertyAssignment(property, undefined, generics)],
			),
		);

		this.assignments.forEach((assignment) => {
			assignment.subscribeAssignmentChanged((newValue) => {
				this.assignmentChanged.next({newValue, property: assignment.getProperty()});
			});
		});
	}

	public getProperties(): IterableIterator<PropertyModel> {
		return Array.from(this.properties).values();
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

	public subscribeAssignmentChanged(cb: (assignment: { property: PropertyModel, newValue: SlangTypeValue | undefined }) => void): Subscription {
		return this.assignmentChanged.subscribe(cb);
	}

	private getByName(propertyName: string): PropertyAssignment {
		const propVal = this.assignments.get(propertyName);
		if (!propVal) {
			throw new Error(`property is not expected: ${propertyName}`);
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
				const vals = this.expandExpr(parts[1], propAssigns);

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

	public static expandType(type: SlangType, properties: PropertyAssignments): SlangType {
		const expandedType = new SlangType(type.getParent(), type.getTypeIdentifier());
		switch (type.getTypeIdentifier()) {
			case TypeIdentifier.Map:
				for (const [subName, subType] of type.getMapSubs()) {
					for (const expSubName of PropertyEvaluator.expand(subName, properties)) {
						expandedType.addMapSub(expSubName, PropertyEvaluator.expandType(subType, properties));
					}
				}
				break;
			case TypeIdentifier.Stream:
				expandedType.setStreamSub(PropertyEvaluator.expandType(type.getStreamSub(), properties));
				break;
			case TypeIdentifier.Generic:
				expandedType.setGenericIdentifier(type.getGenericIdentifier());
				break;
		}

		return expandedType;
	}

	private static expandExpr(exprPart: string, propAssigns: PropertyAssignments): string[] {
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
