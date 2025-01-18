import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface Message {
    id: string
    parent_id?: string
    prompt: string
    response: string
    summary: string
    embedding_2d?: [number, number]
}

export default function ZoomableTree({ messages, summaryZoomLevel = 0.65 }: { messages: Message[], summaryZoomLevel?: number }) {
    const svgRef = useRef<SVGSVGElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return

        const width = containerRef.current.clientWidth
        const height = 650
        const margin = { top: 75, right: 75, bottom: 75, left: 75 }

        const svg = d3.select(svgRef.current)
            .attr("width", width)
            .attr("height", height)

        const g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`)

        // Create separate groups for links and nodes to control layering
        const linksGroup = g.append("g").attr("class", "links")
        const nodesGroup = g.append("g").attr("class", "nodes")

        const stratify = d3.stratify<Message>()
            .id(d => d.id)
            .parentId(d => d.parent_id || null)

        const root = stratify(messages)

        const tree = d3.tree<Message>()
            .size([
                (width - margin.left - margin.right) * 1.5,
                height - margin.top - margin.bottom
            ])
            .separation((a, b) => (a.parent === b.parent ? 6 : 12))

        const treeData = tree(root)

        const simulation = d3.forceSimulation(treeData.descendants())
            .force("collide", d3.forceCollide().radius(80))
            .force("y", d3.forceY().strength(0.1).y(d => (d as any).y))
            .stop()

        for (let i = 0; i < 120; i++) simulation.tick()

        treeData.descendants().forEach((d, i) => {
            d.x = (simulation.nodes()[i] as any).x
        })

        linksGroup.selectAll(".link")
            .data(treeData.links())
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#cbd5e1")
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y)
            )

        const depthColors = [
            "#f0f9ff", // sky-50
            "#ffe4e6", // rose-100
            "#dbeafe", // blue-100
            "#fef3c7", // amber-100
            "#dcfce7", // emerald-100
        ]

        const nodes = nodesGroup.selectAll(".node")
            .data(treeData.descendants())
            .join("g")
            .attr("class", "node")
            .attr("transform", d => `translate(${d.x},${d.y})`)

        nodes.append("foreignObject")
            .attr("x", -120)
            .attr("y", -50)
            .attr("width", 240)
            .attr("height", 100)
            .append("xhtml:div")
            .attr("class", "flex flex-col p-2 rounded-lg border hover:bg-slate-200")
            .style("background-color", d => depthColors[d.depth % depthColors.length])
            .html(d => `
                <div class="text-sm font-medium text-slate-700 truncate">${d.data.prompt}</div>
                <div class="h-px bg-slate-300 my-1"></div>
                <div class="text-xs text-slate-600 line-clamp-3">${d.data.response}</div>
            `)

        nodes.on("mouseover", function (event, d) {
            const nodeGroup = d3.select(this)
            nodeGroup.raise()
            nodeGroup.select("foreignObject div")
                .style("background-color", d3.color(depthColors[d.depth % depthColors.length])?.darker(0.1))
        }).on("mouseout", function (event, d) {
            d3.select(this).select("foreignObject div")
                .style("background-color", depthColors[d.depth % depthColors.length])
        })

        // Calculate bounds
        const bounds = nodesGroup.node()?.getBBox()
        if (bounds) {
            const scale = Math.min(
                width / (bounds.width + margin.left + margin.right),
                height / (bounds.height + margin.top + margin.bottom)
            ) * 1.1

            const dx = (width - bounds.width * scale) / 2
            const dy = (height - bounds.height * scale) / 2

            // Create initial transform
            const initialTransform = d3.zoomIdentity.translate(dx, dy).scale(scale)

            // Apply initial transform
            g.attr("transform", initialTransform.toString())

            // Setup zoom behavior after initial transform
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([scale * 0.5, scale * 2.5])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform)
                    const currentScale = event.transform.k
                    nodes.select("foreignObject div")
                        .html(d => {
                            if (currentScale < summaryZoomLevel) {
                                return `<div class="text-base font-medium text-slate-700">${d.data.summary}</div>`
                            }
                            return `
                                <div class="text-sm font-medium text-slate-700 truncate">${d.data.prompt}</div>
                                <div class="h-px bg-slate-300 my-1"></div>
                                <div class="text-xs text-slate-600 line-clamp-3">${d.data.response}</div>
                            `
                        })
                        .style("background-color", d => depthColors[d.depth % depthColors.length])
                })

            svg.call(zoom)
            svg.call(zoom.transform, initialTransform)
        }

    }, [messages, summaryZoomLevel])

    return (
        <div ref={containerRef} className="w-full h-[600px] overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-slate-50">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    )
}
