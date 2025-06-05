document.addEventListener('DOMContentLoaded', async () => {
    const button = document.getElementById("booklet-btn");
  
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
    if (!tab || !tab.url.endsWith('.pdf')) 
    {
      button.textContent = "Not a PDF tab";
      button.disabled = true;
      return;
    }
  
    try 
    {
        const response = await fetch(tab.url);
        const arrayBuffer = await response.arrayBuffer();
        const filename = tab.url.split('/').pop().split(/[?#]/)[0].replace(/\.pdf$/i, '');
        
        const { PDFDocument } = PDFLib;
        const pdfDoc = await PDFDocument.load(arrayBuffer);
      
        const pageCount = pdfDoc.getPageCount();
  
        if (pageCount % 4 !== 0) 
        {
            button.textContent = "Page count not divisible by 4";
            button.disabled = true;
            return;
        }
  
        button.disabled = false;
    
        button.addEventListener("click", async () => {
        button.textContent = "Generating booklet...";
  
        const bookletPdf = await createBookletPdf(pdfDoc, PDFDocument);
        const bytes = await bookletPdf.save();
        const blob = new Blob([bytes], { type: "application/pdf" });
        const blobUrl = URL.createObjectURL(blob);
  
        // Use Chrome Downloads API
        chrome.downloads.download({
        url: blobUrl,
        filename: `${filename}-booklet.pdf`,
        saveAs: true
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            console.error("Download error:", chrome.runtime.lastError.message);
          } else {
            console.log("Download started, ID:", downloadId);
          }
          button.textContent = "Download as Booklet";
        });
      });
  
    } 
    catch (err) 
    {
      console.error("Error:", err);
      button.textContent = "Error reading PDF";
      button.disabled = true;
    }
});
  
  
async function createBookletPdf(inputPdf, PDFDocument) 
{
    const total = inputPdf.getPageCount();
    const bookletPdf = await PDFDocument.create();
  
    const reordered = [];
    for (let i = 1; i < (total / 2) + 1; i++) 
    {

        if (i % 2 == 1)
        {
            reordered.push(total - (i - 1))
            reordered.push(i)
        }
        else
        {
            reordered.push(i)
            reordered.push(total - (i - 1))
        }
    }
    
    for (let index of reordered) 
    {
      const [copiedPage] = await bookletPdf.copyPages(inputPdf, [index - 1]);
      bookletPdf.addPage(copiedPage);
    }
  
    return bookletPdf;
}
  