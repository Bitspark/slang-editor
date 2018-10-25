import {LandscapeModel} from "../model/landscape";
import {BlueprintModel, BlueprintType} from "../model/blueprint";
import {ApiService, BlueprintApiResponse, BlueprintDefApiResponse} from "../services/api";
import {OperatorModel} from "../model/operator";

export class StorageComponent {
    constructor(private landscape: LandscapeModel, private api: ApiService) {

    }

    public async load(): Promise<void> {
        const bpDataList: Array<BlueprintApiResponse> = await this.api.getBlueprints();
        return new Promise<void>(resolve => {

            const blueprintToOperator = new Map<BlueprintModel, BlueprintDefApiResponse>();

            // 1) Add Blueprints
            bpDataList.forEach(bpData => {
                const type: BlueprintType | null = ({
                    local: BlueprintType.Local,
                    library: BlueprintType.Library,
                    elementary: BlueprintType.Elementary,
                } as any)[bpData.type];

                if (type === null) {
                    throw `unknown blueprint type '${bpData.type}'`;
                }
                const blueprint = this.landscape.createBlueprint(bpData.name, type);
                const def = bpData.def;




                blueprintToOperator.set(blueprint, def);
            });

            // 2) Add Operators. Use previously defined Blueprints for assigning Operator.blueprint
            blueprintToOperator.forEach((bpDef: BlueprintDefApiResponse, outerBlueprint: BlueprintModel) => {
                if (bpDef.operators) {
                    Object.keys(bpDef.operators).forEach((opName: string) => {
                        const opData = bpDef.operators[opName];
                        const blueprint = this.landscape.findBlueprint(opData.operator);
                        if (!blueprint) {
                            throw `unknown blueprint '${opData.operator}'`;
                        }
                        outerBlueprint.createOperator(opName, blueprint);
                    });
                }
            });

            resolve();
        });
    }
}