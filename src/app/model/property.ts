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

    public define(value: any): PropertyDefinition {
        return new PropertyDefinition(this, value);
    }
}

export class PropertyDefinition {
    public constructor(private property: PropertyModel, private value: any) {
    }

    public getValue(): any {
        return this.value;
    }

    public isStreamType(): boolean {
        return this.property.getType() === SlangType.Stream;
    }
}

export class PropertyDefinitions {
    private name2Prop: Map<string, PropertyModel>;
    private name2PropDef: Map<string, PropertyDefinition>;

    public constructor(properties: Array<PropertyModel>) {
        this.name2Prop = new Map<string, PropertyModel>(
            properties.map<[string, PropertyModel]>((property: PropertyModel) => [property.getName(), property])
        );
        this.name2PropDef = new Map<string, PropertyDefinition>();
    }

    public define(propertyName: string, propertyValue: any): PropertyDefinition {
        const property = this.name2Prop.get(propertyName);
        if (!property) {
            throw `Unknown property ${propertyName}`;
        }

        const def = property.define(propertyValue);
        this.name2PropDef.set(property.getName(), def);
        return def;
    }

    public getByName(propertyName: string): PropertyDefinition | undefined {
        return this.name2PropDef.get(propertyName);
    }
}
