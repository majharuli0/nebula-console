const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'public', 'roms', 'lawn_mower.nes');

try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(16);
    fs.readSync(fd, buffer, 0, 16, 0);
    fs.closeSync(fd);
    
    console.log('Hex:', buffer.toString('hex'));
    console.log('ASCII:', buffer.toString('ascii'));
    
    if (buffer.toString('ascii').startsWith('NES\x1a')) {
        console.log('VALID NES HEADER');
    } else {
        console.log('INVALID HEADER');
    }
} catch (err) {
    console.error('Error reading file:', err);
}
