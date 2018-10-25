import {dia, shapes} from "jointjs";
import {OperatorModel} from "./model/operator";
import {BlueprintModel} from "./model/blueprint";

export class JointJSElements {
    public static createBlueprintElement(blueprint: BlueprintModel): dia.Element {
        return new shapes.standard.Rectangle({
            size: {width: 100, height: 100},
            attrs: {
                root: {},
                body: {
                    fill: 'blue',
                    rx: 8,
                    ry: 8,
                },
                label: {
                    text: `${blueprint.getPackageName(0)}\n${blueprint.getShortName()}`,
                    fill: 'white',
                }
            },
            ports: {
                groups: {
                    'MainIn': {
                        position: {
                            name: "top",
                            args: {},
                        },
                        attrs: {
                            'circle': {
                                'r': 4,
                            }
                        }
                    },
                    'MainOut': {
                        position: {
                            name: "bottom",
                            args: {},
                        },
                        attrs: {
                            'circle': {
                                'r': 4,
                            }
                        }
                    }
                },
                items: [
                    // initialize 'rect' with port in group 'a'
                    {
                        group: 'MainIn',
                    },
                    {
                        group: 'MainOut',
                    },
                    // ... other ports
                ]
            }
        });
    }
    public static createOperatorElement(operator: OperatorModel): dia.Element {
        return JointJSElements.createBlueprintElement(operator.getBlueprint());

    }
}

