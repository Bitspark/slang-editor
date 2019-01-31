import m, {CVnode, CVnodeDOM} from "mithril";
import * as Plotly from "plotly.js";
import {Config, ScatterData} from "plotly.js";
import {TypeIdentifier} from "../../../core/definitions/type";
import {ConsoleValueType, IOutputValueTypeAttrs} from "../../interfaces/console";

type GraphType = [{ name: string, data: [{ x: string, y: string }] }];

const plotlyConfig: Partial<Config> = {
	modeBarButtonsToRemove: ["sendDataToCloud"],
	displaylogo: false,
};

export const GRAPH_VALUE_TYPE: ConsoleValueType<GraphType> = {
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
						},
					},
				},
			},
		},
	},

	output: {
		oncreate({attrs, dom}: CVnodeDOM<IOutputValueTypeAttrs<GraphType>>) {
			const graphData = attrs.value.map(({name, data}) => {
				return {
					x: data.map(({x}) => x),
					y: data.map(({y}) => y),
					mode: "lines+markers",
					name,
				} as Partial<ScatterData>;
			});
			const layout = {
				width: 500,
				height: 500,
				xaxis: {
					showgrid: true,
					zeroline: true,
				},
				yaxis: {
					showline: true,
				},
			};
			Plotly.plot(dom as HTMLElement, graphData, layout, plotlyConfig);
			m.redraw();
		},

		view({}: CVnode<IOutputValueTypeAttrs<GraphType>>): m.Children | void | null {
			return m(".sl-graph");
		},
	},
};
