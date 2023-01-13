import m, {ClassComponent, CVnode} from "mithril";
import { AppState } from "../state";
import {Block, Title} from "../../slang/ui/toolkit";
import {SlangType, SlangTypeValue} from "../../slang/definitions/type";
import {Input} from "./console";
import {PropertyAssignments} from "../../slang/core/abstract/utils/properties";
import {TypeSelect} from "../../slang/ui/toolkit/type";
import {GenericSpecifications} from "../../slang/core/abstract/utils/generics";
import {IconButton, Label} from "../../slang/ui/toolkit/buttons";

export interface PropertiesFormAttrs {
    properties: PropertyAssignments;
}


export class PropertiesForm implements ClassComponent<PropertiesFormAttrs> {
    private properties!: PropertyAssignments;
    private formBody = new Map<string, { initValue?: SlangTypeValue, type: SlangType }>();
    private formData = new Map<string, { value: SlangTypeValue }>();

    public oninit({attrs}: CVnode<PropertiesFormAttrs>): any {
        this.properties = attrs.properties;
        this.formBody = this.getFormBody();
        this.formData = new Map<string, { value: SlangTypeValue }>();
    }

    public view(_: CVnode<PropertiesFormAttrs>): m.Children {
        return m(Block,
            m(Title, `Properties`),
            Array.from(this.formBody.entries()).map(([fieldName, fieldAttrs]) => {
                return this.renderPropertyInput(fieldName, fieldAttrs);
            }),
        );
    }

    protected getFormBody(): Map<string, { initValue?: SlangTypeValue, type: SlangType }> {
        return Array.from(this.properties.getAssignments()).reduce((map, propAssign) => {
            const type = propAssign.getType();
            if (!type) {
                return map;
            }
            const initValue = propAssign.getValue();
            return map.set(propAssign.getName(), !SlangTypeValue.isUndefined(initValue) ? {initValue, type} : {type});
        }, new Map<string, { initValue?: SlangTypeValue, type: SlangType }>());
    }

    protected beforeFormSubmit(formData: Map<string, { value: SlangTypeValue }>): Map<string, { value: SlangTypeValue }> {
        return formData;
    }

    private renderPropertyInput(fieldName: string, {type, initValue}: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
        return m(Input.ConsoleEntry, {
            type,
            size: "small",
            label: fieldName,
            initValue: !this.formData.has(fieldName) ? initValue : undefined,
            onInput: (v: any) => {
                this.formData.set(fieldName, v);
                this.beforeFormSubmit(this.formData).forEach((value, propertyName) => {
                    this.properties.get(propertyName).assign(value);
                });
            },
        });
    }
}

export interface GenericsFormAttrs {
    generics: GenericSpecifications;
}

export class GenericsForm implements ClassComponent<GenericsFormAttrs> {
    private generics!: GenericSpecifications;

    public oninit({attrs}: CVnode<GenericsFormAttrs>): any {
        this.generics = attrs.generics;
    }

    public view(_: CVnode<GenericsFormAttrs>): any {
        return m(Block,
            m(Title, "Generics"),
            Array.from(this.generics.identifiers()).map((genId) => this.renderInput(genId)),
        );
    }

    private renderInput(genId: string): m.Children {
        let genType: SlangType;

        try {
            genType = this.generics.get(genId);
        } catch {
            genType = SlangType.newUnspecified();
        }

        return m(TypeSelect, {
            label: genId,
            type: genType,
            onInput: (nType: SlangType) => {
                console.log("GENS", genId, nType)
                this.generics.specify(genId, nType);
            },
        });
    }
}

export class StartingOperatorDetails implements ClassComponent<any> {
    private properties?: PropertyAssignments;
    private generics?: GenericSpecifications;

    // @ts-ignore
    public oninit({attrs}: CVnode<any>): any {
        const blueprint = AppState.currentBlueprint;

        if (blueprint.hasProperties()) {
            this.properties = new PropertyAssignments(blueprint.getProperties(), blueprint.getGenerics());
        }

        if (blueprint.hasGenerics()) {
            this.generics = new GenericSpecifications(blueprint.getGenericIdentifiers());
        }
    }

    // @ts-ignore
    public view({attrs}: CVnode<any>) {
        const blueprint = AppState.currentBlueprint;

        if (!blueprint.isStarting) {
            return;
        }

        const properties = this.properties
        const generics = this.generics

        return m(".sle-comp__starting-operator",
            properties ? m(PropertiesForm, {properties}): undefined,
            generics ? m(GenericsForm, {generics}): undefined,
                m(IconButton, { // run operator
                    class: "is-dark",
                    fas: "play",
                    async onclick() {
                        console.dir(generics)
                        console.dir(properties)
                        await AppState.run(blueprint, generics, properties);
                        m.redraw();
                    },
                }, m(Label, "Run operator"))
        )
	}
}