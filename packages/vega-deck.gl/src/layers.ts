// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { base } from './base';
import { ChromaticTextLayer, ChromaticTextLayerProps } from './chromatic-text-layer/chromatic-text-layer';
import { concat } from './array';
import {
    Cube,
    PresenterConfig,
    Stage,
    StyledLine,
    VegaTextLayerDatum
} from './interfaces';
import { CubeLayer, CubeLayerInterpolatedProps, CubeLayerProps } from './cube-layer/cube-layer';
import {PathLayer} from '@deck.gl/layers';
import { DeckProps } from '@deck.gl/core/lib/deck';
import { easeExpInOut } from 'd3-ease';
import { Layer } from 'deck.gl';
import { layerNames } from './constants';
import { LayerProps, LightSettings, TransitionTiming } from '@deck.gl/core/lib/layer';
import { LinearInterpolator_Class } from './deck.gl-classes/linearInterpolator';
import { Presenter } from './presenter';

export function getLayers(
    presenter: Presenter,
    config: PresenterConfig,
    stage: Stage,
    lightSettings: LightSettings,
    lightingMix: number,
    interpolator: LinearInterpolator_Class<CubeLayerInterpolatedProps>,
    guideLines: StyledLine[]
): Layer[] {
    const cubeLayer = newCubeLayer(presenter, config, stage.cubeData, presenter.style.highlightColor, lightSettings, lightingMix, interpolator);
    const { x, y } = stage.axes;
    const lines = concat(stage.gridLines, guideLines);
    const texts = [...stage.textData];
    [x, y].forEach(axes => {
        axes.forEach(axis => {
            if (axis.domain) lines.push(axis.domain);
            if (axis.ticks) lines.push.apply(lines, axis.ticks);
            if (axis.tickText) texts.push.apply(texts, axis.tickText);
            if (axis.title) texts.push(axis.title);
        });
    });
    if (stage.facets) {
        stage.facets.forEach(f => {
            if (f.lines) lines.push.apply(lines, f.lines);
        });
    }
    const lineLayer = newLineLayer(layerNames.lines, lines);
    const textLayer = newTextLayer(presenter, layerNames.text, texts, config, presenter.style.fontFamily);

    const data = [ 
        {path: [[0.0,0.0], [1.0,2.0], [2.0,4.0], [3.0,9.0]],
            name: 'test',
            color: [255,0,0]}
    ];
    const pathLayer = new PathLayer({
        id:'path-layer',
        data,
        pickable: false,
        widthScale: 20,
        getPath: d=>d.path,
        getColor: d=> d.color
    });
    return [textLayer, cubeLayer, lineLayer];
}

function newCubeLayer(presenter: Presenter, config: PresenterConfig, cubeData: Cube[], highlightColor: number[], lightSettings: LightSettings, lightingMix: number, interpolator?: LinearInterpolator_Class<CubeLayerInterpolatedProps>) {
    const getPosition = getTiming(config.transitionDurations.position, easeExpInOut);
    const getSize = getTiming(config.transitionDurations.size, easeExpInOut);
    const getColor = getTiming(config.transitionDurations.color);
    const cubeLayerProps: CubeLayerProps = {
        interpolator,
        lightingMix,
        id: layerNames.cubes,
        data: cubeData,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.IDENTITY,
        pickable: true,
        autoHighlight: true,
        highlightColor,
        onClick: (o, e) => {
            config.onCubeClick(e && e.srcEvent, o.object as Cube);
        },
        onHover: (o, e) => {
            if (o.index === -1) {
                presenter.deckgl.interactiveState.onCube = false;
                config.onCubeHover(e && e.srcEvent, null);
            } else {
                presenter.deckgl.interactiveState.onCube = true;
                config.onCubeHover(e && e.srcEvent, o.object as Cube);
            }
        },
        lightSettings,
        transitions: {
            getPosition,
            getColor,
            getSize
        }
    };
    return new CubeLayer(cubeLayerProps);
}

function newLineLayer(id: string, data: StyledLine[]) {
    return new base.layers.LineLayer({
        id,
        data,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.IDENTITY,
        getColor: (o: StyledLine) => o.color,
        getStrokeWidth: (o: StyledLine) => o.strokeWidth
    });
}

function newTextLayer(presenter: Presenter, id: string, data: VegaTextLayerDatum[], config: PresenterConfig, fontFamily: string) {
    const props: LayerProps & ChromaticTextLayerProps = {
        id,
        data,
        coordinateSystem: base.deck.COORDINATE_SYSTEM.IDENTITY,
        autoHighlight: true,
        pickable: true,
        getHighlightColor: config.getTextHighlightColor || (o => o.color),
        onClick: (o, e) => {
            let pe: Partial<PointerEvent> = e && e.srcEvent;
            config.onTextClick && config.onTextClick(pe as PointerEvent, o.object as VegaTextLayerDatum);
        },
        onHover: (o, e) => {
            if (o.index === -1) {
                presenter.deckgl.interactiveState.onText = false;
            } else {
                presenter.deckgl.interactiveState.onText = config.onTextHover ? config.onTextHover(e && e.srcEvent, o.object as VegaTextLayerDatum) : true;
            }
        },
        getColor: config.getTextColor || (o => o.color),
        getTextAnchor: o => o.textAnchor,
        getSize: o => o.size,
        getAngle: o => o.angle,
        fontSettings: {
            sdf: true,
            fontSize: 128,
            buffer: 3
        }
    };
    if (fontFamily) {
        props.fontFamily = fontFamily;
    }
    return new ChromaticTextLayer(props);
}

function getTiming(duration: number, easing?: (t: number) => number) {
    let timing: TransitionTiming;
    if (duration) {
        timing = {
            duration
        };
        if (easing) {
            timing.easing = easing;
        }
    }
    return timing;
}

export function getCubeLayer(deckProps: DeckProps) {
    return deckProps.layers.filter(layer => layer.id === layerNames.cubes)[0];
}

export function getCubes(deckProps: DeckProps) {
    const cubeLayer = getCubeLayer(deckProps);
    if (!cubeLayer) return;
    const cubeLayerProps = cubeLayer.props as CubeLayerProps;
    return cubeLayerProps.data;
}
