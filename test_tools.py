import os
from tools import save_to_txt

def test_save_to_txt(tmp_path):
    # Create a temporary file 'output.txt' with initial content.
    original_file = tmp_path / "output.txt"
    original_file.write_text("Initial content")
    
    # Call the save function. This function should rename the file and save new content.
    result = save_to_txt("Test data", str(original_file))
    
    # List all files in the temporary directory.
    new_files = list(tmp_path.iterdir())
    # Find a file that contains "output.txt" in its name and isn't the original file.
    renamed_file = next((file for file in new_files if "output.txt" in str(file) and file != original_file), None)
    
    assert renamed_file is not None, "Expected file not found after save_to_txt"
    # Check that the renamed file now contains the new data.
    saved_content = renamed_file.read_text()
    assert "Test data" in saved_content
    # Verify that the function returns a confirmation message.
    assert "Data saved" in result
