import {TypeIdentifier} from "../definitions/type";

export function tid2css(tid: TypeIdentifier | "ghost"): string {
	if (tid === "ghost") {
		return "sl-type-ghost";
	}
	return `sl-type-${TypeIdentifier[tid].toLowerCase()}`;
}

export interface CSSType {
	[propertyName: string]: boolean;
}

export function cssobj(css: string): CSSType {
	const classList = css ? css.replace("  ", " ").split(" ") : [];
	return classList.reduce((result, curr) => {
		result[curr] = true;
		return result;
	}, {} as { [propName: string]: boolean });
}

export function cssattr(css: { [propertyName: string]: boolean }): string {
	return Object.keys(css).filter((propName) => css[propName]).reduce((result, propName) => {
		return result + " " + propName;
	}, "");
}

export function cssupdate(orig: CSSType, newer: CSSType): CSSType {
	Object.keys(newer).forEach((propName) => {
		if (typeof newer[propName] === "undefined") {
			return;
		}
		orig[propName] = newer[propName];
	});
	return orig;
}
