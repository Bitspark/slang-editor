import {SlangType, TypeModel} from "./type";

export class PropertyModel {
    public constructor(private name: string, private type: TypeModel) {
    }

    public getName(): string {
        return this.name;
    }

    public getType(): SlangType {
        return this.type.getType();
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

    public isStreamType(): boolean {
        return this.property.getType() === SlangType.Stream;
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

    public assign(propertyName: string, propertyValue: any): PropertyAssignment {
        const property = this.name2Prop.get(propertyName);
        if (!property) {
            throw `unknown property: ${propertyName}`;
        }
        const def = property.define(propertyValue);
        this.name2propAssign.set(property.getName(), def);
        return def;
    }

    public getByName(propertyName: string): PropertyAssignment {
        const propVal = this.name2propAssign.get(propertyName);
        if (!propVal) {
            throw `property not assigned: ${propertyName}`;
        }
        return propVal;
    }
}
