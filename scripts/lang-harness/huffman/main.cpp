#include "algo.cpp"
#include <iostream>
#include <map>
#include <sstream>
std::map<std::string, std::string> codes;
long long walk(const Node& n, const std::string& p, int d) {
    if (!n->left && !n->right) { codes[n->ch] = p; return n->freq * d; }
    return walk(n->left, p + "0", d + 1) + walk(n->right, p + "1", d + 1);
}
int main() {
    std::string l1, l2, mode, t;
    std::getline(std::cin, l1); std::getline(std::cin, l2); std::getline(std::cin, mode);
    std::vector<std::string> sym; std::vector<long long> fr;
    std::istringstream a(l1), b(l2);
    while (a >> t) sym.push_back(t);
    long long x;
    while (b >> x) fr.push_back(x);
    Node r = huffman(sym, fr);
    std::cout << (r ? walk(r, "", 0) : 0) << "\n";
    if (mode == "codes") {
        bool first = true;
        for (auto& [k, v] : codes) { std::cout << (first ? "" : " ") << k << "=" << v; first = false; }
        std::cout << "\n";
    }
}
