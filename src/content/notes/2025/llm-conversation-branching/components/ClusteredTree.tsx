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

export default function ClusteredTree({ messages }: { messages: Message[] }) {
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

        const stratify = d3.stratify<Message>()
            .id(d => d.id)
            .parentId(d => d.parent_id || null)

        const root = stratify(messages)

        const treeLayout = d3.tree<Message>()
            .size([width - margin.left - margin.right, height - margin.top - margin.bottom])
            .nodeSize([250, 150])
            .separation((a, b) => a.parent === b.parent ? 1.2 : 2)

        const treeData = treeLayout(root)

        // Only apply embedding positions if they exist
        treeData.descendants().forEach((d, i) => {
            if (d.data.embedding_2d) {
                const [x, y] = d.data.embedding_2d
                const scale = 60
                d.x = x * scale + width / 2
                d.y = y * scale + height / 2
            }
        })

        const links = g.selectAll(".link")
            .data(treeData.links())
            .join("path")
            .attr("class", "link")
            .attr("fill", "none")
            .attr("stroke", "#cbd5e1")
            .attr("d", d3.linkVertical()
                .x(d => d.x)
                .y(d => d.y)
            )

        const nodes = g.selectAll(".node")
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
            .attr("class", "flex flex-col p-2 rounded-lg border bg-slate-100 hover:bg-slate-200")
            .html(d => `
                <div class="text-sm font-medium text-slate-700 truncate">${d.data.prompt}</div>
                <div class="h-px bg-slate-300 my-1"></div>
                <div class="text-xs text-slate-600 line-clamp-3">${d.data.response}</div>
            `)

        // Add mouseover event to bring node to front
        nodes.on("mouseover", function () {
            // Raise this node's group to the front
            const nodeGroup = d3.select(this)
            nodeGroup.raise()

            // Update styles
            nodeGroup.select("foreignObject div")
                .style("background-color", "#e2e8f0") // Darker background on hover
        }).on("mouseout", function () {
            // Restore original background color
            d3.select(this).select("foreignObject div")
                .style("background-color", "#f1f5f9")
        })

        // Calculate bounds of all nodes
        const bounds = g.node()?.getBBox()
        if (bounds) {
            const scale = Math.min(
                width / (bounds.width + margin.left + margin.right),
                height / (bounds.height + margin.top + margin.bottom)
            ) * 0.9

            const dx = (width - bounds.width * scale) / 2
            const dy = (height - bounds.height * scale) / 2

            // Create initial transform
            const initialTransform = d3.zoomIdentity.translate(dx, dy).scale(scale)

            // Apply initial transform
            g.attr("transform", initialTransform.toString())

            // Setup zoom behavior after initial transform
            const zoom = d3.zoom<SVGSVGElement, unknown>()
                .scaleExtent([0.1, 4])
                .on("zoom", (event) => {
                    g.attr("transform", event.transform)
                    const currentScale = event.transform.k
                    nodes.select("foreignObject div")
                        .html(d => {
                            if (currentScale < 0.8) {
                                return `<div class="text-base font-medium text-slate-700">${d.data.summary}</div>`
                            }
                            return `
                                <div class="text-sm font-medium text-slate-700 truncate">${d.data.prompt}</div>
                                <div class="h-px bg-slate-300 my-1"></div>
                                <div class="text-xs text-slate-600 line-clamp-3">${d.data.response}</div>
                            `
                        })
                })

            svg.call(zoom)
            svg.call(zoom.transform, initialTransform)
        }

    }, [messages])

    return (
        <div ref={containerRef} className="w-full h-[600px] overflow-hidden border border-slate-200 rounded-lg shadow-sm bg-slate-50">
            <svg ref={svgRef} className="w-full h-full" />
        </div>
    )
}
