import m, {CVnode, CVnodeDOM} from "mithril";
import {Output, ConsoleValueType} from "../console";
import {TypeIdentifier} from "../../../custom/type";
import * as Plotly from "plotly.js";
import {Config, ScatterData} from "plotly.js";


type GraphType = [{ name: string, data: [{ x: string, y: string }] }];

const PlotlyConfig: Partial<Config> = {
	modeBarButtonsToRemove: ["sendDataToCloud"],
	displaylogo: false,
};


export const GraphValueType: ConsoleValueType<GraphType> = {
	typeDef: {
		type: TypeIdentifier.Stream,
		stream: {
			type: TypeIdentifier.Map,
			map: {
				name: {type: TypeIdentifier.String},
				data: {
					type: TypeIdentifier.Stream,
					stream: {
						type: TypeIdentifier.Map,
						map: {
							x: {type: TypeIdentifier.Primitive},
							y: {type: TypeIdentifier.Primitive},
						}
					}
				}
			}
		}
	},

	output: {
		oncreate({attrs, dom}: CVnodeDOM<Output.ValueTypeAttrs<GraphType>>) {
			const data = attrs.value.map(({name, data}) => {
				return {
					x: data.map(({x}) => x),
					y: data.map(({y}) => y),
					mode: "lines+markers",
					name: name,
				} as Partial<ScatterData>;
			});
			const layout = {
				width: 500,
				height: 500,
				xaxis: {
					showgrid: true,
					zeroline: true
				},
				yaxis: {
					showline: true
				}
			};
			Plotly.plot(dom as HTMLElement, data, layout, PlotlyConfig);
			m.redraw();
		},
		view({attrs}: CVnode<Output.ValueTypeAttrs<GraphType>>) {
			return m(".sl-graph");
		}
	}
};
