const fs = require('fs');
const path = require('path');
const readlineSync = require('readline-sync');

// Function to read the first line of a file
function readFirstLine(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');
        const firstLine = data.split('\n')[0].trim();
        return firstLine;
    } catch (error) {
        console.error(`Error reading file: ${filePath}`, error);
        return null;
    }
}

// Function to parse CSV line and extract required fields
function extractFields(line) {
    const fields = line.split(','); // Assumes CSV format
    if (fields.length >= 11) {
        return {
            f1: fields[0].trim(),
            f2: fields[1].trim(),
            f3: fields[2].trim(),
            f4: fields[3].trim(),
            f11: fields[10].trim() // Time of day
        };
    }
    return null;
}

// Function to convert time (HH:MM:SS) to total seconds
function timeToSeconds(time) {
    const parts = time.split(':');
    if (parts.length === 3) {
        const [hh, mm, ss] = parts.map(Number);
        return hh * 3600 + mm * 60 + ss; // Convert to total seconds
    }
    return Infinity; // Default if invalid time
}

// Function to convert seconds to HH:MM:SS format with whole seconds
function secondsToHHMMSS(seconds) {
    if (seconds === 0) return '00:00:00';
    
    // Ensure whole number of seconds
    const wholeSeconds = Math.floor(seconds); 

    const hh = Math.floor(wholeSeconds / 3600);
    const mm = Math.floor((wholeSeconds % 3600) / 60);
    const ss = wholeSeconds % 60;

    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

// Get directory from user input
const directory = readlineSync.question('Enter the directory path: ').trim();

if (!fs.existsSync(directory) || !fs.lstatSync(directory).isDirectory()) {
    console.error('Invalid directory path!');
    process.exit(1);
}

// Find .lif files
const lifFiles = fs.readdirSync(directory)
    .filter(file => file.endsWith('.lif'))
    .map(file => path.join(directory, file));

if (lifFiles.length === 0) {
    console.log('No .lif files found in the directory.');
    process.exit(0);
}

// Process files and extract data
const extractedLines = [];

lifFiles.forEach(filePath => {
    const firstLine = readFirstLine(filePath);
    if (firstLine) {
        const fields = extractFields(firstLine);
        if (fields) {
            const timeInSeconds = timeToSeconds(fields.f11);
            const concatenatedLine = `${fields.f1},${fields.f2},${fields.f3},${fields.f4},${fields.f11}`;
            extractedLines.push({ line: concatenatedLine, timeValue: timeInSeconds });
        }
    }
});

// Sort by time field
extractedLines.sort((a, b) => a.timeValue - b.timeValue);

// Compute time differences
let previousTime = null;
const outputLines = extractedLines.map((entry, index) => {
    let timeDiffFormatted = '00:00:00';
    if (previousTime !== null && entry.timeValue !== Infinity) {
        const timeDiff = Math.floor(entry.timeValue - previousTime); // Truncate to whole seconds
        timeDiffFormatted = secondsToHHMMSS(timeDiff);
    }
    previousTime = entry.timeValue;
    return `${entry.line},${timeDiffFormatted}`;
});

// Write to output file
const outputFile = path.join(directory, 'output.csv');
fs.writeFileSync(outputFile, outputLines.join('\n'));

console.log(`Sorted output saved to: ${outputFile}`);
