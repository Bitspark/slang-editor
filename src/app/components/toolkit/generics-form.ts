import {GenericSpecifications} from "../../../slang/core/abstract/utils/generics";
import m, {ClassComponent, CVnode} from "mithril";
import {Block, Title} from "../../../slang/ui/toolkit";
import {SlangType} from "../../../slang/definitions/type";
import {TypeSelect} from "../../../slang/ui/toolkit/type";

export interface GenericsFormAttrs {
    generics: GenericSpecifications;
    readonly: boolean;
}

export class GenericsForm implements ClassComponent<GenericsFormAttrs> {
    private generics!: GenericSpecifications;
    private readonly = false;

    public oninit({attrs}: CVnode<GenericsFormAttrs>): any {
        this.generics = attrs.generics;
        this.readonly = attrs.readonly;
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
                if (this.readonly) {
                    return;
                }
                this.generics.specify(genId, nType);
            },
        });
    }
}