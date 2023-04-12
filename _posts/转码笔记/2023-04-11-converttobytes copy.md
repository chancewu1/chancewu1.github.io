---
layout: post
title: MegaBytes, GigaBytes 转化成bytes
category: 转码笔记
tags: [trick]
description: 工作时的小发现 
---

## Python里如何将Megabytes,Gigabytes转化成Bytes
2gb.

这时需要进行单位转化来分析我们的objects size. 一开始转成了Bytes in decimal by timing 1000000 , 后来被senior指出应该转化成为Bytes in binary获得更准确的结果，在python里可以使用 `pow()` function.


- 转化 128mb to bytes: 

```python
128 * pow(2,20) #2的20此方
```

- 转化 2gb to bytes:

```python
2 * pow(2,30)
```

引用:

Many hard drive manufacturers use a decimal number system to define amounts of storage space. As a result, 1 MB is defined as one million bytes, 1 GB is defined as one billion bytes, and so on. Since your computer uses a binary system as mentioned above, you may notice a discrepancy between your hard drive's published capacity and the capacity acknowledged by your computer. For example, a hard drive that is said to contain 10 GB of storage space using a decimal system is actually capable of storing 10,000,000,000 bytes. However, in a binary system, 10 GB is 10,737,418,240 bytes. As a result, instead of acknowledging 10 GB, your computer will acknowledge 9.31 GB. This is not a malfunction but a matter of different definitions.



We count in base 10 by powers of 10:

  10/^1 = 10

  10/^2 = 10*10 =  100

  10/^3 = 10*10*10 = 1,000

  10/^6 = 1,000,000


Computers count by base 2:

  2/^1 = 2

  2/^2 = 2*2 = 4

  2/^3 = 2*2*2 = 8

  2/^10 = 1,024

  2/^20 = 1,048,576



So in computer jargon, the following units are used:

|Unit	|Equivalent|
| ----------- | ----------- |
|1 kilobyte (KB)|1,024 bytes|
|1 megabyte (MB)|	1,048,576 bytes|
|1 gigabyte (GB)|	1,073,741,824 bytes|
|1 terabyte (TB)|	1,099,511,627,776 bytes|
|1 petabyte (PB)|	1,125,899,906,842,624 bytes|


人工和电脑的bytes

| Megabytes (MB)| Bytes (B) decimal| Bytes (B) binary|
| ----------- | ----------- |--------------|
| 1 MB    | 1,000,000 Bytes    |1,048,576 Bytes|

