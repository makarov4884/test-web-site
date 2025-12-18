total = 0
count = 0

with open('excel/data/new_crawl_data.txt', 'r', encoding='utf-8') as f:
    for line in f:
        cols = line.strip().split('\t')
        if len(cols) >= 5:
            try:
                balloon = int(cols[4])
                total += balloon
                count += 1
            except:
                pass

print(f'Lines: {count}')
print(f'Total: {total:,}')
