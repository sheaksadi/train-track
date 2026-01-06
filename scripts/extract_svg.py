#!/usr/bin/env python3
"""
Extract precise coordinates from BVG SVG by analyzing transform matrices.
SVG viewBox is 0 0 1190.55 841.89
"""

import re
import json
from xml.etree import ElementTree as ET

# BVG line colors (from official colors)
BVG_COLORS = {
    # U-Bahn
    'U1': (125, 173, 76),   # Green
    'U2': (218, 66, 30),    # Red
    'U3': (0, 122, 91),     # Teal
    'U4': (240, 215, 34),   # Yellow
    'U5': (126, 83, 48),    # Brown
    'U6': (140, 109, 171),  # Purple
    'U7': (82, 141, 186),   # Blue
    'U8': (34, 79, 134),    # Dark Blue
    'U9': (243, 121, 29),   # Orange
    # S-Bahn
    'S1': (221, 108, 165),  # Pink
    'S2': (0, 99, 46),      # Green
    'S3': (10, 76, 157),    # Blue
    'S41': (164, 54, 29),   # Ring red
    'S42': (164, 54, 29),   # Ring red
    'S5': (245, 121, 33),   # Orange
    'S7': (129, 109, 166),  # Purple
    'S8': (85, 168, 34),    # Light Green
    'S9': (138, 18, 18),    # Dark Red
}

def rgb_to_tuple(rgb_str):
    """Convert 'rgb(x%, y%, z%)' to tuple."""
    match = re.search(r'rgb\(([0-9.]+)%,\s*([0-9.]+)%,\s*([0-9.]+)%\)', rgb_str)
    if match:
        return (
            int(float(match.group(1)) * 2.55),
            int(float(match.group(2)) * 2.55),
            int(float(match.group(3)) * 2.55)
        )
    return None

def color_distance(c1, c2):
    """Calculate color distance."""
    return sum((a - b) ** 2 for a, b in zip(c1, c2)) ** 0.5

def identify_line(rgb_str):
    """Identify U/S-Bahn line from color."""
    c = rgb_to_tuple(rgb_str)
    if not c:
        return None
    
    best_match = None
    best_dist = float('inf')
    
    for line, color in BVG_COLORS.items():
        dist = color_distance(c, color)
        if dist < best_dist:
            best_dist = dist
            best_match = line
    
    return best_match if best_dist < 50 else None

def parse_matrix(transform_str):
    """Parse matrix transform to get position."""
    match = re.search(r'matrix\(([^,]+),([^,]+),([^,]+),([^,]+),([^,]+),([^)]+)\)', transform_str)
    if match:
        return {
            'a': float(match.group(1)),
            'b': float(match.group(2)),
            'c': float(match.group(3)),
            'd': float(match.group(4)),
            'e': float(match.group(5)),  # x translation
            'f': float(match.group(6)),  # y translation
        }
    return None

def extract_path_points(d_string, matrix=None):
    """Extract key points from path d string."""
    points = []
    
    # Parse M (moveto) and L (lineto) commands
    parts = re.split(r'([MLCHVZAQ])', d_string)
    
    current_cmd = None
    for part in parts:
        part = part.strip()
        if part in 'MLCHVZAQ':
            current_cmd = part
        elif current_cmd in ['M', 'L'] and part:
            # Extract coordinates
            nums = re.findall(r'[-+]?\d*\.?\d+', part)
            for i in range(0, len(nums) - 1, 2):
                x, y = float(nums[i]), float(nums[i+1])
                
                # Apply matrix transform
                if matrix:
                    new_x = matrix['a'] * x + matrix['c'] * y + matrix['e']
                    new_y = matrix['b'] * x + matrix['d'] * y + matrix['f']
                    x, y = new_x, new_y
                
                points.append((x, y))
    
    return points

def main():
    svg_path = '/home/sheaksadi/projects/train-track/public/bvg_map.svg'
    
    tree = ET.parse(svg_path)
    root = tree.getroot()
    
    # Collect line data
    lines_data = {}
    
    for path in root.iter('{http://www.w3.org/2000/svg}path'):
        stroke = path.get('stroke', '')
        d = path.get('d', '')
        transform = path.get('transform', '')
        
        line_id = identify_line(stroke)
        if line_id and len(d) > 100:  # Significant path
            matrix = parse_matrix(transform)
            points = extract_path_points(d, matrix)
            
            if points:
                if line_id not in lines_data:
                    lines_data[line_id] = []
                lines_data[line_id].extend(points)
    
    # Print results
    print("=== Extracted Line Coordinates ===\n")
    print(f"ViewBox: 0 0 1190.55 841.89")
    print(f"Scale: 1190.55 x 841.89 pixels\n")
    
    for line_id, points in sorted(lines_data.items()):
        if points:
            print(f"\n{line_id}: {len(points)} points")
            # Show bounding box
            xs = [p[0] for p in points]
            ys = [p[1] for p in points]
            print(f"  X range: {min(xs):.1f} - {max(xs):.1f}")
            print(f"  Y range: {min(ys):.1f} - {max(ys):.1f}")
            # Show sample points
            print(f"  Sample points:")
            for p in points[:5]:
                print(f"    ({p[0]:.1f}, {p[1]:.1f})")

if __name__ == '__main__':
    main()
