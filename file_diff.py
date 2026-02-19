"""Simple file diff viewer - shows differences like GitHub split diff."""
import streamlit as st
import streamlit.components.v1 as components
import difflib
import json

# Set page to wide mode
st.set_page_config(layout="wide", page_title="File Diff Viewer")

# Remove padding and margins
st.markdown("""
<style>
    .main .block-container {
        padding-top: 1rem;
        padding-bottom: 0rem;
        padding-left: 1rem;
        padding-right: 1rem;
        max-width: 100%;
    }
    header {visibility: hidden;}
    footer {visibility: hidden;}
    iframe {
        border: none !important;
    }
    .stApp {
        margin: 0;
        padding: 0;
    }
</style>
""", unsafe_allow_html=True)

col1, col2, col3 = st.columns([2, 2, 1])

with col1:
    file1 = st.file_uploader("File 1", key="file1")

with col2:
    file2 = st.file_uploader("File 2", key="file2")

with col3:
    font_size = st.slider("Font", 8, 16, 11)

if file1 and file2:
    # Read files
    content1 = file1.read().decode('utf-8').splitlines()
    content2 = file2.read().decode('utf-8').splitlines()

    # Get file extension
    file_ext = file1.name.split('.')[-1] if '.' in file1.name else 'txt'

    # Use SequenceMatcher for aligned diff
    matcher = difflib.SequenceMatcher(None, content1, content2)

    diff_rows = []
    diff_blocks = []  # Track diff blocks for selection
    block_id = 0
    line_num1 = 0
    line_num2 = 0

    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            # Unchanged lines - show on both sides
            for i in range(i1, i2):
                line_num1 += 1
                line_num2 += 1
                left = content1[i].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                right = content2[j1 + (i - i1)].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                diff_rows.append(f'<tr data-equal="true"><td class="ln">{line_num1}</td><td class="code">{left}</td><td class="ln">{line_num2}</td><td class="code">{right}</td></tr>')
        elif tag == 'delete' or tag == 'insert' or tag == 'replace':
            # Diff block - make it selectable
            block_start_line1 = line_num1
            block_start_line2 = line_num2

            if tag == 'delete':
                # Add block header
                diff_rows.append(f'<tr class="block-header" data-block="{block_id}"><td colspan="4" class="block-selector" onclick="selectSide({block_id}, \'left\')"><span class="block-badge">Diff Block {block_id + 1}</span></td></tr>')

                for i in range(i1, i2):
                    line_num1 += 1
                    left = content1[i].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    diff_rows.append(f'<tr class="diff-row" data-block="{block_id}" data-side="left"><td class="ln del">{line_num1}</td><td class="code del" onclick="selectSide({block_id}, \'left\')">{left}</td><td class="ln empty"></td><td class="code empty"></td></tr>')

                diff_blocks.append({
                    'id': block_id,
                    'type': 'delete',
                    'left': content1[i1:i2],
                    'right': [],
                    'left_start': block_start_line1,
                    'right_start': block_start_line2
                })

            elif tag == 'insert':
                # Add block header
                diff_rows.append(f'<tr class="block-header" data-block="{block_id}"><td colspan="4" class="block-selector" onclick="selectSide({block_id}, \'right\')"><span class="block-badge">Diff Block {block_id + 1}</span></td></tr>')

                for j in range(j1, j2):
                    line_num2 += 1
                    right = content2[j].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                    diff_rows.append(f'<tr class="diff-row" data-block="{block_id}" data-side="right"><td class="ln empty"></td><td class="code empty"></td><td class="ln add">{line_num2}</td><td class="code add" onclick="selectSide({block_id}, \'right\')">{right}</td></tr>')

                diff_blocks.append({
                    'id': block_id,
                    'type': 'insert',
                    'left': [],
                    'right': content2[j1:j2],
                    'left_start': block_start_line1,
                    'right_start': block_start_line2
                })

            elif tag == 'replace':
                # Add block header
                diff_rows.append(f'<tr class="block-header" data-block="{block_id}"><td colspan="4" class="block-selector"><span class="block-badge">Diff Block {block_id + 1} - Click Left or Right to Select</span></td></tr>')

                max_lines = max(i2 - i1, j2 - j1)
                left_lines = []
                right_lines = []

                for idx in range(max_lines):
                    left_line = ""
                    right_line = ""
                    left_num = ""
                    right_num = ""
                    left_class = "empty"
                    right_class = "empty"

                    if idx < (i2 - i1):
                        line_num1 += 1
                        left_line = content1[i1 + idx].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        left_num = str(line_num1)
                        left_class = "del"
                        left_lines.append(content1[i1 + idx])

                    if idx < (j2 - j1):
                        line_num2 += 1
                        right_line = content2[j1 + idx].replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
                        right_num = str(line_num2)
                        right_class = "add"
                        right_lines.append(content2[j1 + idx])

                    diff_rows.append(f'<tr class="diff-row" data-block="{block_id}"><td class="ln {left_class}">{left_num}</td><td class="code {left_class}" onclick="selectSide({block_id}, \'left\')">{left_line}</td><td class="ln {right_class}">{right_num}</td><td class="code {right_class}" onclick="selectSide({block_id}, \'right\')">{right_line}</td></tr>')

                diff_blocks.append({
                    'id': block_id,
                    'type': 'replace',
                    'left': left_lines,
                    'right': right_lines,
                    'left_start': block_start_line1,
                    'right_start': block_start_line2
                })

            block_id += 1

    if diff_rows:
        # Convert diff blocks to JSON for JavaScript
        diff_blocks_json = json.dumps(diff_blocks)

        html = f'''
        <html>
        <head>
        <style>
            * {{ margin: 0; padding: 0; box-sizing: border-box; }}
            body {{ width: 100vw; height: 100vh; overflow: hidden; }}
            .controls {{
                padding: 8px;
                background: #f8f8f8;
                border-bottom: 2px solid #ddd;
                display: flex;
                gap: 10px;
                align-items: center;
            }}
            .btn {{
                padding: 6px 12px;
                border: 1px solid #ccc;
                border-radius: 4px;
                background: white;
                cursor: pointer;
                font-size: 13px;
            }}
            .btn:hover {{ background: #f0f0f0; }}
            .btn.active {{ background: #007bff; color: white; border-color: #007bff; }}
            .container {{ width: 100%; height: calc(100% - 50px); overflow: auto; }}
            table {{
                width: 100%;
                table-layout: fixed;
                border-collapse: collapse;
                font-size: {font_size}px;
                line-height: 1.4;
                border: 1px solid #ddd;
            }}
            th {{
                background-color: #f0f0f0;
                padding: 6px 4px;
                text-align: left;
                border-bottom: 2px solid #ddd;
                font-weight: bold;
                position: sticky;
                top: 0;
                z-index: 10;
            }}
            th:nth-child(1), th:nth-child(2) {{ border-right: 2px solid #ddd; }}
            .ln {{
                background-color: #fff;
                color: #999;
                padding: 1px 4px;
                text-align: right;
                border-right: 1px solid #ddd;
                user-select: none;
                width: 50px;
                min-width: 50px;
                max-width: 50px;
            }}
            .code {{
                background-color: #fff;
                white-space: pre-wrap;
                word-wrap: break-word;
                padding: 1px 4px;
                font-family: 'Courier New', Consolas, Monaco, monospace;
                cursor: pointer;
            }}
            .code:hover {{ background-color: #e8e8e8 !important; }}
            .ln.del {{ background-color: #ffdddd; }}
            .code.del {{ background-color: #ffdddd; border-right: 2px solid #ddd; }}
            .ln.add {{ background-color: #ddffdd; }}
            .code.add {{ background-color: #ddffdd; }}
            .ln.empty {{ background-color: #f5f5f5; }}
            .code.empty {{ background-color: #f5f5f5; cursor: default; }}

            .block-header {{
                background: #f0f0f0;
                border-top: 2px solid #aaa;
                border-bottom: 1px solid #ccc;
            }}
            .block-selector {{
                padding: 4px 8px;
                text-align: center;
                cursor: pointer;
                font-weight: bold;
                color: #555;
            }}
            .block-selector:hover {{
                background: #e0e0e0;
            }}
            .block-badge {{
                background: #fff;
                padding: 2px 8px;
                border-radius: 3px;
                border: 1px solid #ccc;
                font-size: 11px;
            }}

            .diff-row.selected-left {{
                background: #e3f2fd;
            }}
            .diff-row.selected-left .code.del {{
                background-color: #bbdefb !important;
                border-left: 4px solid #1976d2;
            }}
            .diff-row.selected-right {{
                background: #e3f2fd;
            }}
            .diff-row.selected-right .code.add {{
                background-color: #bbdefb !important;
                border-right: 4px solid #1976d2;
            }}
            .diff-row.deselected {{ opacity: 0.3; }}
        </style>
        </head>
        <body>
        <div class="controls">
            <button class="btn" onclick="setDefault('left')">Use Left as Default</button>
            <button class="btn" onclick="setDefault('right')">Use Right as Default</button>
            <button class="btn" onclick="generateOutput()">Download Merged File</button>
            <span id="status" style="margin-left: 10px; color: #666;"></span>
        </div>
        <div class="container">
        <table>
            <thead>
                <tr>
                    <th style="width: 50px;">Line</th>
                    <th>{file1.name}</th>
                    <th style="width: 50px;">Line</th>
                    <th>{file2.name}</th>
                </tr>
            </thead>
            <tbody>
                {"".join(diff_rows)}
            </tbody>
        </table>
        </div>
        <script>
            const diffBlocks = {diff_blocks_json};
            const selections = {{}};
            let defaultSide = null;

            function selectSide(blockId, side) {{
                selections[blockId] = side;
                updateDisplay();
            }}

            function setDefault(side) {{
                defaultSide = side;
                document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
                event.target.classList.add('active');
                document.getElementById('status').textContent = `Default: ${{side === 'left' ? '{file1.name}' : '{file2.name}'}}`;
                updateDisplay();
            }}

            function updateDisplay() {{
                diffBlocks.forEach(block => {{
                    const rows = document.querySelectorAll(`[data-block="${{block.id}}"]`);
                    const selected = selections[block.id] || defaultSide;

                    rows.forEach(row => {{
                        row.classList.remove('selected-left', 'selected-right', 'deselected');
                        if (selected === 'left') {{
                            row.classList.add('selected-left');
                        }} else if (selected === 'right') {{
                            row.classList.add('selected-right');
                        }}
                    }});
                }});
            }}

            function generateOutput() {{
                const result = [];
                const originalLines1 = {json.dumps(content1)};
                const originalLines2 = {json.dumps(content2)};
                const opcodes = {json.dumps([(tag, i1, i2, j1, j2) for tag, i1, i2, j1, j2 in matcher.get_opcodes()])};

                let blockIdx = 0;

                // Process opcodes in order
                opcodes.forEach(opcode => {{
                    const [tag, i1, i2, j1, j2] = opcode;

                    if (tag === 'equal') {{
                        // Add unchanged lines from file1
                        for (let i = i1; i < i2; i++) {{
                            result.push(originalLines1[i]);
                        }}
                    }} else {{
                        // This is a diff block - check selection
                        const selected = selections[blockIdx] || defaultSide || 'left';

                        if (selected === 'left') {{
                            // Use lines from file1
                            for (let i = i1; i < i2; i++) {{
                                result.push(originalLines1[i]);
                            }}
                        }} else if (selected === 'right') {{
                            // Use lines from file2
                            for (let j = j1; j < j2; j++) {{
                                result.push(originalLines2[j]);
                            }}
                        }}

                        blockIdx++;
                    }}
                }});

                // Create download
                const blob = new Blob([result.join('\\n')], {{ type: 'text/plain' }});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'xin_selection.{file_ext}';
                a.click();
                URL.revokeObjectURL(url);

                document.getElementById('status').textContent = 'Downloaded!';
                setTimeout(() => document.getElementById('status').textContent = '', 3000);
            }}
        </script>
        </body>
        </html>
        '''
        components.html(html, height=1200, scrolling=True)
    else:
        st.success("Files are identical!")
