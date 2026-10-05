// Huffman coding — complete C++17 reference.
#include <algorithm>
#include <memory>
#include <string>
#include <vector>

struct HNode {
    std::string ch;
    long long freq;
    std::shared_ptr<HNode> left, right;
};
using Node = std::shared_ptr<HNode>;

Node huffman(const std::vector<std::string>& symbols, const std::vector<long long>& freqs) {
    std::vector<Node> nodes;
    for (size_t i = 0; i < symbols.size(); i++) nodes.push_back(std::make_shared<HNode>(HNode{symbols[i], freqs[i], nullptr, nullptr})); // @a: init
    if (nodes.empty()) return nullptr;
    while (nodes.size() > 1) {
        std::stable_sort(nodes.begin(), nodes.end(), [](const Node& a, const Node& b) { return a->freq < b->freq; }); // @a: sort
        Node a = nodes.front();
        nodes.erase(nodes.begin());
        Node b = nodes.front();
        nodes.erase(nodes.begin());
        nodes.push_back(std::make_shared<HNode>(HNode{"", a->freq + b->freq, a, b})); // @a: merge
    }
    return nodes[0]; // @a: done
}
