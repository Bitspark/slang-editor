import m, {ClassComponent, CVnode} from "mithril";
import {AppState} from "../state";
import {PropertyAssignments} from "../../slang/core/abstract/utils/properties";
import {GenericSpecifications} from "../../slang/core/abstract/utils/generics";
import {IconButton, Label} from "../../slang/ui/toolkit/buttons";
import {PropertiesForm} from "./toolkit/properties-form";
import {GenericsForm} from "./toolkit/generics-form";


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
                        await AppState.run(blueprint, generics, properties);
                        m.redraw();
                    },
                }, m(Label, "Run operator"))
        )
	}
}