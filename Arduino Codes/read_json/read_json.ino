#include <SPIFFS.h>

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("Starting to read files from SPIFFS...");
  
  // Initialize SPIFFS
  if(!SPIFFS.begin(true)) {
    Serial.println("SPIFFS mount failed");
    return;
  }
  
  // List all files
  listFiles();
  
  Serial.println("\nUse the following commands:");
  Serial.println("- DELETE:filename - Delete a specific file");
  Serial.println("- READ:filename - Read a specific file");
  Serial.println("- JSON - Output all files as JSON");
  Serial.println("- LISTFILES - List all files");
}

void loop() {
  if(Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if(command.startsWith("DELETE:")) {
      String fileName = command.substring(7);
      deleteFile(fileName);
    }
    else if(command.startsWith("READ:")) {
      String fileName = command.substring(5);
      readFile(fileName);
    }
    else if(command == "JSON") {
      outputFilesAsJSON();
    }
    else if(command == "LISTFILES") {
      listFiles();
    }
  }
  delay(100);
}

void listFiles() {
  File root = SPIFFS.open("/");
  File file = root.openNextFile();
  
  Serial.println("\n--- SPIFFS File List ---");
  int fileCount = 0;
  
  while(file) {
    fileCount++;
    Serial.print(fileCount);
    Serial.print(". File: ");
    Serial.print(file.name());
    Serial.print(" (");
    Serial.print(file.size());
    Serial.println(" bytes)");
    file = root.openNextFile();
  }
  
  if(fileCount == 0) {
    Serial.println("No files found");
  }
  
  Serial.println("---------------------");
}

void readFile(String fileName) {
  if(!fileName.startsWith("/")) {
    fileName = "/" + fileName;
  }
  
  if(!SPIFFS.exists(fileName)) {
    Serial.println("File does not exist: " + fileName);
    return;
  }
  
  File file = SPIFFS.open(fileName, "r");
  if(!file) {
    Serial.println("Unable to open file: " + fileName);
    return;
  }
  
  Serial.print("\n------ File content: ");
  Serial.print(fileName);
  Serial.println(" ------");
  
  // Read and print file content
  while(file.available()) {
    Serial.write(file.read());
  }
  
  Serial.println("\n------ End of file ------\n");
  file.close();
}

void deleteFile(String fileName) {
  if(!fileName.startsWith("/")) {
    fileName = "/" + fileName;
  }
  
  if(!SPIFFS.exists(fileName)) {
    Serial.println("File does not exist: " + fileName);
    return;
  }
  
  if(SPIFFS.remove(fileName)) {
    Serial.println("File deleted: " + fileName);
    // Update file list
    listFiles();
  } else {
    Serial.println("Failed to delete file: " + fileName);
  }
}

void outputFilesAsJSON() {
  File root = SPIFFS.open("/");
  File file = root.openNextFile();
  
  // Start JSON output
  Serial.println("{\"files\":[");
  bool firstFile = true;
  
  while(file) {
    if (!firstFile) {
      Serial.println(",");
    } else {
      firstFile = false;
    }
    
    // Start file object
    Serial.print("  {\"name\":\"");
    Serial.print(file.name());
    Serial.print("\", \"size\":");
    Serial.print(file.size());
    Serial.print(", \"content\":\"");
    
    // Read and print file content (escaped for JSON)
    while(file.available()) {
      char c = file.read();
      
      // Escape special characters for JSON
      if (c == '"') Serial.print("\\\"");
      else if (c == '\\') Serial.print("\\\\");
      else if (c == '\b') Serial.print("\\b");
      else if (c == '\f') Serial.print("\\f");
      else if (c == '\n') Serial.print("\\n");
      else if (c == '\r') Serial.print("\\r");
      else if (c == '\t') Serial.print("\\t");
      else Serial.write(c);
    }
    
    // End file object
    Serial.print("\"}");
    
    file = root.openNextFile();
  }
  
  // End JSON output
  Serial.println("\n]}");
}