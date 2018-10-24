import {AppModel} from '../model/app';

export class RouterComponent {

    constructor(private appModel: AppModel) {
        this.subscribe();
        this.publish();
    }

    public checkRoute(): void {
        const url = window.location.pathname;
        const paths = url.split('/');
        if (paths.length <= 2) {
            this.openLandscape();
            return;
        } else {
            switch (paths[1]) {
                case 'blueprint':
                    this.openBlueprint(paths[2]);
            }
        }
    }

    private openBlueprint(fullName: string) {
        const blueprint = this.appModel.getLandscape().findBlueprint(fullName);
        if (blueprint) {
            blueprint.open();
        }
    }

    private openLandscape() {
        this.appModel.getLandscape().open();
    }
    
    private subscribe(): void {
        this.appModel.subscribeOpenedBlueprintChanged(blueprint => {
            if (blueprint !== null) {
                const title = `${blueprint.getFullName()} Blueprint | Slang Studio`;
                const url = `blueprint/${blueprint.getFullName()}`;
                window.history.pushState({type: 'blueprint', fullName: blueprint.getFullName()}, title, url);
            }
        });
        this.appModel.subscribeOpenedLandscapeChanged(blueprint => {
            if (blueprint !== null) {
                const title = `Blueprint Landscape | Slang Studio`;
                const url = `/`;
                window.history.pushState({type: 'landscape'}, title, url);
            }
        });
    }

    private publish() {
        const that = this;
        window.addEventListener('popstate', function (event: PopStateEvent) {
            that.checkRoute();
        });
    }

}