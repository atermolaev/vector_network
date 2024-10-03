type Transform = [[number, number, number], [number, number, number]];

type BlendMode =
    | 'PASS_THROUGH'
    | 'NORMAL'
    | 'DARKEN'
    | 'MULTIPLY'
    | 'LINEAR_BURN'
    | 'COLOR_BURN'
    | 'LIGHTEN'
    | 'SCREEN'
    | 'LINEAR_DODGE'
    | 'COLOR_DODGE'
    | 'OVERLAY'
    | 'SOFT_LIGHT'
    | 'HARD_LIGHT'
    | 'DIFFERENCE'
    | 'EXCLUSION'
    | 'HUE'
    | 'SATURATION'
    | 'COLOR'
    | 'LUMINOSITY'

interface RGB {
    readonly r: number
    readonly g: number
    readonly b: number
}

interface RGBA {
    readonly r: number
    readonly g: number
    readonly b: number
    readonly a: number
}

interface SolidPaint {
    readonly type: 'SOLID'
    readonly color: RGB
    readonly visible?: boolean
    readonly opacity?: number
    readonly blendMode?: BlendMode
}

interface ColorStop {
    readonly position: number
    readonly color: RGBA
}

interface GradientPaint {
    readonly type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND'
    readonly gradientTransform: Transform
    readonly gradientStops: ReadonlyArray<ColorStop>
    readonly visible?: boolean
    readonly opacity?: number
    readonly blendMode?: BlendMode
    readonly color?: RGB
}

interface ImageFilters {
    readonly exposure?: number
    readonly contrast?: number
    readonly saturation?: number
    readonly temperature?: number
    readonly tint?: number
    readonly highlights?: number
    readonly shadows?: number
}

interface ImagePaint {
    readonly type: 'IMAGE'
    readonly scaleMode: 'FILL' | 'FIT' | 'CROP' | 'TILE'
    readonly imageHash: string | null
    readonly imageTransform?: Transform
    readonly scalingFactor?: number
    readonly rotation?: number
    readonly filters?: ImageFilters
    readonly visible?: boolean
    readonly opacity?: number
    readonly blendMode?: BlendMode
    readonly color?: RGB
}

type Paint = SolidPaint | GradientPaint | ImagePaint;

declare type StrokeCap = 'NONE' | 'ROUND' | 'SQUARE' | 'ARROW_LINES' | 'ARROW_EQUILATERAL'
declare type StrokeJoin = 'MITER' | 'BEVEL' | 'ROUND'
declare type HandleMirroring = 'NONE' | 'ANGLE' | 'ANGLE_AND_LENGTH' | 'RIGHT_ANGLE'
declare type WindingRule = 'NONZERO' | 'EVENODD'

interface VectorVertex {
    readonly x: number
    readonly y: number
    readonly strokeCap?: StrokeCap
    readonly strokeJoin?: StrokeJoin
    readonly cornerRadius?: number
    readonly handleMirroring?: HandleMirroring
}

interface Vector {
    readonly x: number
    readonly y: number
}

interface VectorSegment {
    readonly start: number
    readonly end: number
    readonly tangentStart?: Vector
    readonly tangentEnd?: Vector
}

interface VectorRegion {
    readonly windingRule: WindingRule
    readonly loops: ReadonlyArray<ReadonlyArray<number>>
    readonly fills?: ReadonlyArray<Paint>
    readonly fillStyleId?: string
}

interface VectorNetwork {
    readonly vertices: ReadonlyArray<VectorVertex>
    readonly segments: ReadonlyArray<VectorSegment>
    readonly regions?: ReadonlyArray<VectorRegion>
}

const flattenArray = function<T>(arr: T[][]): T[] {
    return arr.reduce((acc, curVal) => {
        return acc.concat(curVal)
    }, []);
}

export const convertVectorNetwork = (vectorNetwork) => {
    // Получаем вершины
    const arVertices = vectorNetwork?.vertices !== undefined ? vectorNetwork?.vertices : [];
    // Получаем объект с данными для кривых безье
    const arSegments = vectorNetwork?.segments !== undefined ? vectorNetwork?.segments : [];

    /**
     * Функция для перебора циклов с координатами
     * @param itemLoopElem Массив циклов
     * @returns Строку для path-элемента, для атрибута "d"
     */
    const createLoopPath = (itemLoopElem: readonly number[]) => {    
        return itemLoopElem.map((itemLoopVert: number, index) => {
        // Определяем номер вершины старта кривой безье в массиве вершин(arVetrices)   
        const startItem = arSegments[itemLoopVert].start;
        // Определяем номер вершины окончания кривой безье в массиве вершин(arVertices)
        const endItem = arSegments[itemLoopVert].end;
        
        // Блок с проверками координат касательных
        const x1TgEnd = arSegments[startItem]?.tangentStart?.x !== undefined 
            ? arSegments[startItem]?.tangentStart?.x 
            : 0
        const y1TgEnd = arSegments[startItem]?.tangentStart?.y !== undefined 
            ? arSegments[startItem]?.tangentStart?.y
            : 0
        const x2TgEnd = arSegments[startItem]?.tangentEnd?.x !== undefined 
            ? arSegments[startItem]?.tangentEnd?.x 
            : 0
        const y2TgEnd = arSegments[startItem]?.tangentEnd?.y !== undefined 
            ? arSegments[startItem]?.tangentEnd?.y
            : 0
        
        // Определяем пару x,y для касательной начальной точки
        const x1 = x1TgEnd !== undefined ? x1TgEnd + arVertices[startItem].x : 0;
        const y1 = y1TgEnd !== undefined ? y1TgEnd + arVertices[startItem].y : 0;
        // Определяем пару x,y для касательной конечной точки
        const x2 = x2TgEnd !== undefined ? x2TgEnd + arVertices[endItem]?.x : 0;
        const y2 = y2TgEnd !== undefined ? y2TgEnd + arVertices[endItem]?.y : 0;
        
        // Определяем признак первой точки
        const isLastSymbol = index + 1 === itemLoopElem.length;
        // Определяем признак последней точки
        const isFirstStr = index === 0;
        // Определяем строку с завершающим сиволом
        const lastSymbol = isLastSymbol ? 'Z' : '';
        // Определяем строку с параметрами начальных координат
        const firstStr = isFirstStr ? `M ${arVertices[startItem].x} ${arVertices[startItem].y}` : '';
        
        // Формируем нужную строку с кривой бизье, относительно первой, последней или нейтральной точки
        return isFirstStr 
            ? `${firstStr} C ${x1} ${y1} ${x2} ${y2} ${arVertices[endItem]?.x} ${arVertices[endItem]?.y}` 
            : isLastSymbol 
            ? `C ${x1} ${y1} ${x2} ${y2} ${arVertices[endItem]?.x} ${arVertices[endItem]?.y} ${lastSymbol}`
            : `C ${x1} ${y1} ${x2} ${y2} ${arVertices[endItem]?.x} ${arVertices[endItem]?.y}`;
        })
        .join(' '); // склееваем массив строк в одну строку
    }

    // Получаем  циклы точек
    const loops = vectorNetwork?.regions?.map((item) => item.loops);
    // Получаем path-строку для каждого цикла точек
    const vectorStrings = loops?.map((itemLoop) => itemLoop.map(createLoopPath));
    // Проверка на существование
    const vectorStringsCurrent = vectorStrings !== undefined ? vectorStrings : [];
    
    // Склееваем все строки в одну строку и возвращаем результат
    return flattenArray(vectorStringsCurrent).join(' ');
}
