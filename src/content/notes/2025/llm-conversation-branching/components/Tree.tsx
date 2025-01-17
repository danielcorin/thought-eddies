import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

interface Message {
    id: string;
    parent_id?: string;
    prompt: string;
    response: string;
}

interface TreeProps {
    messages: Message[];
    onNodeClick: (nodeId: string) => void;
    selectedId: string;
    setSelectedId: (id: string) => void;
}

export default function Tree({ messages, onNodeClick, selectedId, setSelectedId }: TreeProps) {
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;

        const updateDimensions = () => {
            const container = containerRef.current!;
            const width = container.clientWidth;
            const height = Math.max(800, container.clientHeight);

            const margin = {
                top: 50,
                right: width < 640 ? 30 : 90,
                bottom: 50,
                left: width < 640 ? 30 : 90
            };

            // Clear existing SVG content
            d3.select(svgRef.current).selectAll("*").remove();

            const svg = d3.select(svgRef.current)
                .attr("width", width)
                .attr("height", height);

            const g = svg.append("g")
                .attr("transform", `translate(${margin.left},${margin.top})`);

            // Convert flat messages array to hierarchical structure
            const stratify = d3.stratify<Message>()
                .id(d => d.id)
                .parentId(d => d.parent_id || null);

            const root = stratify(messages);

            const tree = d3.tree<Message>()
                .size([
                    width - margin.left - margin.right,
                    (height - margin.top - margin.bottom) * 0.6
                ])
                .separation((a, b) => {
                    return (a.parent === b.parent ? 2 : 4);
                });

            const treeData = tree(root);

            // Add links
            g.selectAll(".link")
                .data(treeData.links())
                .join("path")
                .attr("class", "link")
                .attr("fill", "none")
                .attr("stroke", "#cbd5e1")
                .attr("d", d3.linkVertical()
                    .x(d => d.x)
                    .y(d => d.y)
                );

            // Add nodes
            const nodes = g.selectAll(".node")
                .data(treeData.descendants())
                .join("g")
                .attr("class", "node")
                .attr("transform", d => `translate(${d.x},${d.y})`);

            // Add node containers
            nodes.append("foreignObject")
                .attr("x", width < 640 ? -80 : -120)
                .attr("y", -50)
                .attr("width", width < 640 ? 160 : 240)
                .attr("height", width < 640 ? 140 : 100)
                .append("xhtml:div")
                .attr("class", d => `flex flex-col p-2 rounded-lg cursor-pointer border overflow-hidden ${d.id === selectedId ? 'bg-slate-200 border-slate-400' : 'bg-slate-100 hover:bg-slate-200 border-transparent'}`)
                .html(d => `
                <div class="text-sm font-medium text-slate-700 truncate">${d.data.prompt}</div>
                <div class="h-px bg-slate-300 my-1"></div>
                <div class="text-xs text-slate-600 line-clamp-3">${d.data.response}</div>
            `)
                .on("click", (event, d) => {
                    if (d.id) {
                        setSelectedId(d.id);
                        onNodeClick(d.id);
                    }
                });
        };

        // Initial render
        updateDimensions();

        // Add resize listener
        const resizeObserver = new ResizeObserver(updateDimensions);
        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, [messages, onNodeClick, selectedId]);

    return (
        <div ref={containerRef} className="w-full h-full overflow-auto">
            <div className="min-h-[550px] relative">
                <svg ref={svgRef} className="w-full h-full absolute inset-0"></svg>
            </div>
        </div>
    );
}
