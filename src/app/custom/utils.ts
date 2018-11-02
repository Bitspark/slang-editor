import {attributes, dia, shapes} from "jointjs";
import {PortModel} from "../model/port";
import SVGAttributes = attributes.SVGAttributes;
import {BlackBox} from './nodes';
import {TypeIdentifier} from "./type";
import {PropertyAssignments} from "../model/property";

export interface ParsedPortInformation {
    instance: string
    delegate: string | undefined
    service: string | undefined
    directionIn: boolean
    port: string
}

export class PropertyEvaluator {
    public static expand(str: string, propAssigns?: PropertyAssignments): Array<string> {
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


    private static expandExpr(exprPart: string, propAssigns: PropertyAssignments): Array<string> {
        const vals: Array<string> = [];
        const propAssign = propAssigns.getByName(exprPart);

        if (!propAssign) {
            return [];
        }

        const propValue: any = propAssign.getValue();

        if (propAssign.isStreamType()) {
            if (typeof propValue === 'string' && (propValue as string).startsWith('$')) {
                vals.push(`{${propValue.substr(1)}}`);
            }
            else {
                for (const el of propValue) {
                    vals.push((typeof el === 'string') ? el : JSON.stringify(el));
                }
            }
        } else {
            vals.push((typeof propValue === 'string') ? propValue : JSON.stringify(propValue));
        }
        return vals;
    }
}

export class SlangParsing {
    public static parseReferenceString(portReference: string): ParsedPortInformation | undefined {
        if (portReference.length === 0) {
            return undefined;
        }

        const parsedInfo: ParsedPortInformation = {
            instance: "",
            delegate: undefined,
            service: undefined,
            directionIn: false,
            port: ""
        };

        let separator = '';
        let operatorIdx = 0;
        let portIdx = 0;
        if (portReference.indexOf('(') !== -1) {
            parsedInfo.directionIn = true;
            separator = '(';
            operatorIdx = 1;
            portIdx = 0;
        } else if (portReference.indexOf(')') !== -1) {
            parsedInfo.directionIn = false;
            separator = ')';
            operatorIdx = 0;
            portIdx = 1;
        } else {
            return undefined;
        }

        const referenceSplit = portReference.split(separator);
        if (referenceSplit.length !== 2) {
            return undefined;
        }
        const instancePart = referenceSplit[operatorIdx];
        parsedInfo.port = referenceSplit[portIdx];

        if (instancePart === '') {
            parsedInfo.instance = '';
            parsedInfo.service = 'main';
        } else {
            if (instancePart.indexOf('.') !== -1 && instancePart.indexOf('@') !== -1) {
                // Delegate and service must not both occur in string
                return undefined;
            }
            if (instancePart.indexOf('.') !== -1) {
                const instanceSplit = instancePart.split('.');
                if (instanceSplit.length === 2) {
                    parsedInfo.instance = instanceSplit[0];
                    parsedInfo.delegate = instanceSplit[1];
                }
            } else if (instancePart.indexOf('@') !== -1) {
                const instanceSplit = instancePart.split('@');
                if (instanceSplit.length === 2) {
                    parsedInfo.instance = instanceSplit[1];
                    parsedInfo.service = instanceSplit[0];
                }
            } else {
                parsedInfo.instance = instancePart;
                parsedInfo.service = 'main';
            }
        }

        return parsedInfo;
    }
}
