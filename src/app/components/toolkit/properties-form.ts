import {PropertyAssignments} from "../../../slang/core/abstract/utils/properties";
import m, {ClassComponent, CVnode} from "mithril";
import {SlangType, SlangTypeValue} from "../../../slang/definitions/type";
import {Block, Title} from "../../../slang/ui/toolkit";
import {Input} from "../console";

export interface PropertiesFormAttrs {
    properties: PropertyAssignments;
    readonly: boolean;
}

export class PropertiesForm implements ClassComponent<PropertiesFormAttrs> {
    private properties!: PropertyAssignments;
    private readonly = false;
    private formBody = new Map<string, { initValue?: SlangTypeValue, type: SlangType }>();
    private formData = new Map<string, { value: SlangTypeValue }>();

    public oninit({attrs}: CVnode<PropertiesFormAttrs>): any {
        this.properties = attrs.properties;
        this.readonly = attrs.readonly;
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

    private renderPropertyInput(fieldName: string, {
        type,
        initValue
    }: { type: SlangType, initValue?: SlangTypeValue }): m.Children {
        return m(Input.ConsoleEntry, {
            type,
            size: "small",
            label: fieldName,
            initValue: !this.formData.has(fieldName) ? initValue : undefined,
            onInput: (v: any) => {
                if (this.readonly) {
                    return;
                }

                this.formData.set(fieldName, v);
                this.beforeFormSubmit(this.formData).forEach((value, propertyName) => {
                    this.properties.get(propertyName).assign(value);
                });
            },
        });
    }
}