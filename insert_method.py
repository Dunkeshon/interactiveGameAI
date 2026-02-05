import re

# Read the current game.js file
with open('game.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Read the drawEndScreen method
with open('draw_end_screen_method.txt', 'r', encoding='utf-8') as f:
    method_content = f.read()

# Find the position to insert (before updateUI method)
# We'll insert right before "    updateUI() {"
insert_marker = "    updateUI() {"

# Insert the method
if insert_marker in content:
    content = content.replace(insert_marker, f"{method_content}\r\n    \r\n{insert_marker}")
    
    # Write back
    with open('game.js', 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Successfully added drawEndScreen method!")
else:
    print(f"ERROR: Could not find insert marker: {insert_marker}")
