import {PropertyAssignments} from "../model/property";

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

		if (propAssign.isStream()) {
			if (typeof propValue === "string" && (propValue as string).startsWith("$")) {
				vals.push(`{${propValue.substr(1)}}`);
			}
			else {
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
